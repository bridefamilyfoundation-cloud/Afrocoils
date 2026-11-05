import { BodyTooLarge, readText } from '../_shared/body.ts'
import { fetchReceived, htmlToText, verifyResendWebhook, type Mailbox } from '../_shared/email.ts'
import { serve } from '../_shared/env.ts'
import { db } from '../_shared/members.ts'
import { insertReturning, patch, select } from '../_shared/supabase.ts'

/**
 * Mail to support@ and hello@afrocoils.app, from Resend's inbound webhook.
 *
 * Resend receives for the domain (the MX record in docs/membership-setup.md)
 * and POSTs an `email.received` event here carrying only the envelope;
 * the body is fetched from Resend's API. What is stored is text: HTML is
 * reduced to text first, so the admin site never renders a stranger's
 * markup. Attachments are not kept — the admin sees that there were
 * some, and asks for anything needed by reply.
 *
 * Believed only when the Svix signature matches RESEND_WEBHOOK_SECRET.
 * Webhook URL: `https://<ref>.supabase.co/functions/v1/inbound`.
 */

interface ReceivedEvent {
  type: string
  data: {
    email_id?: string
    id?: string
    to?: string[]
    received_for?: string[]
    attachments?: { filename?: string }[]
  }
}

interface MessageRow {
  id: number
  thread_id: number | null
}

const MAX_BODY_CHARS = 50_000

/** The bare address out of `Name <addr>`. */
function address(value: string): string {
  return (/<([^>]+)>/.exec(value)?.[1] ?? value).trim().toLowerCase()
}

function mailboxOf(recipients: string[]): Mailbox | null {
  const addresses = recipients.map(address)
  if (addresses.includes('support@afrocoils.app')) return 'support'
  if (addresses.includes('hello@afrocoils.app')) return 'hello'
  return null
}

/** "Re: Fwd: My order" → "my order", so a reply finds its thread. */
function baseSubject(subject: string): string {
  return subject.replace(/^\s*((re|fwd?|aw)\s*:\s*)+/i, '').trim().toLowerCase()
}

async function findThread(from: string, subject: string, inReplyTo: string | undefined): Promise<number | null> {
  const config = db()
  if (inReplyTo) {
    const [hit] = await select<MessageRow>(
      config,
      'support_messages',
      `message_id=eq.${encodeURIComponent(inReplyTo)}&select=id,thread_id&limit=1`,
    )
    if (hit) return hit.thread_id ?? hit.id
  }
  // The same sender on the same subject within a month is the same conversation.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const candidates = await select<MessageRow & { subject: string }>(
    config,
    'support_messages',
    `or=(from_address.eq.${encodeURIComponent(from)},to_address.eq.${encodeURIComponent(from)})&created_at=gte.${since}&select=id,thread_id,subject&order=created_at.desc&limit=20`,
  )
  const match = candidates.find((row) => baseSubject(row.subject) === baseSubject(subject))
  return match ? (match.thread_id ?? match.id) : null
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })

  let raw: string
  try {
    raw = await readText(req, 256 * 1024)
  } catch (error) {
    if (error instanceof BodyTooLarge) return new Response(null, { status: 413 })
    throw error
  }
  if (!(await verifyResendWebhook(req, raw))) {
    console.warn('[inbound] bad signature, ignored')
    return new Response(null, { status: 401 })
  }

  const event = JSON.parse(raw) as ReceivedEvent
  if (event.type !== 'email.received') return new Response(null, { status: 200 })
  const id = event.data.email_id ?? event.data.id
  if (!id) return new Response(null, { status: 200 })

  try {
    // A redelivery of something already stored.
    const [seen] = await select<MessageRow>(db(), 'support_messages', `resend_id=eq.${encodeURIComponent(id)}&select=id&limit=1`)
    if (seen) return new Response(null, { status: 200 })

    const mail = await fetchReceived(id)
    const mailbox = mailboxOf([...(event.data.received_for ?? []), ...(mail.to ?? [])])
    if (!mailbox) return new Response(null, { status: 200 })

    const from = address(mail.from)
    const subject = (mail.subject ?? '').slice(0, 300)
    let text = mail.text?.trim() || (mail.html ? htmlToText(mail.html) : '')
    const attachments = event.data.attachments?.length ?? 0
    if (attachments > 0) text += `\n\n[${attachments} attachment${attachments === 1 ? '' : 's'} not kept]`
    const headers = Object.fromEntries(Object.entries(mail.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]))
    const inReplyTo = headers['in-reply-to']?.trim()

    const thread = await findThread(from, subject, inReplyTo)
    const row = await insertReturning<MessageRow>(db(), 'support_messages', {
      resend_id: id,
      direction: 'in',
      mailbox,
      from_address: from,
      to_address: `${mailbox}@afrocoils.app`,
      subject,
      body: text.slice(0, MAX_BODY_CHARS),
      message_id: mail.message_id ?? headers['message-id'] ?? null,
      thread_id: thread,
    })
    if (row && thread === null) {
      await patch(db(), 'support_messages', `id=eq.${row.id}`, { thread_id: row.id })
    } else if (thread !== null) {
      // A new message reopens a closed conversation.
      await patch(db(), 'support_messages', `thread_id=eq.${thread}&direction=eq.in`, { status: 'open' })
    }
  } catch (error) {
    console.error('[inbound] could not store a message', error)
    // Resend retries a non-2xx, which is what we want here.
    return new Response(null, { status: 500 })
  }
  return new Response(null, { status: 200 })
})
