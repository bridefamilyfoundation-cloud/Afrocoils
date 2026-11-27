/**
 * The mailing list and broadcasts (migration 0011, added 2026-11-27).
 *
 * The owner keeps a list of addresses on the admin site — people who
 * asked to hear from AfroCoils, typed or pasted in, and members, brought
 * in with one button — ticks some or all of them and sends one message.
 * Being on the list is not being a member, and the list is not used for
 * anything but these messages.
 *
 * Three rules, because this is the one kind of mail people did not ask
 * for each time:
 *
 * - Every message carries an unsubscribe link of its own, and the
 *   one-click `List-Unsubscribe` headers mail providers show as a button.
 *   Both go to `inbound/unsubscribe` with the row's random token.
 * - An address that unsubscribed is never sent to again. Its row stays,
 *   with `unsubscribed_at`, as that record; adding it again by hand or
 *   importing members does not undo it. Only the person can, by writing.
 * - A broadcast goes only to rows on the list. One-off mail to anyone
 *   else is the Mail page's compose, not this.
 *
 * Sent from hello@, so a reply lands in the hello inbox on the admin
 * site. The privacy policy has the sentence for all of it.
 */
import { env } from './env.ts'
import { FROM_HELLO, type OutgoingMail, escapeHtml, sendBatch } from './email.ts'
import { db } from './members.ts'
import { insertReturning, patch, remove, select, upsert } from './supabase.ts'
import { normalEmail } from './token.ts'

const enc = encodeURIComponent

export interface ContactRow {
  email: string
  name: string | null
  source: 'admin' | 'member'
  added_at: string
  added_by: string | null
  unsubscribe_token: string
  unsubscribed_at: string | null
}

export class MailingRefusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/** The most one broadcast sends: a function call has minutes, not hours. */
export const MAX_BROADCAST = 5000
/** Resend's batch endpoint takes up to 100 messages a call. */
const BATCH = 100

/* ------------------------------------------------------------------ *
 * The list
 * ------------------------------------------------------------------ */

/** Contacts, newest first, without their tokens: the admin site never needs one. */
export async function listContacts(q: string) {
  const term = q.toLowerCase().replace(/[*,()]/g, '').slice(0, 100)
  const filter = term ? `&email=ilike.*${enc(term)}*` : ''
  const [rows, members] = await Promise.all([
    select<Omit<ContactRow, 'unsubscribe_token'>>(
      db(),
      'mailing_list',
      `select=email,name,source,added_at,added_by,unsubscribed_at&order=added_at.desc&limit=${MAX_BROADCAST}${filter}`,
    ),
    select<{ email: string }>(db(), 'members', `select=email&limit=10000`),
  ])
  const memberSet = new Set(members.map((m) => m.email))
  return rows.map((row) => ({ ...row, member: memberSet.has(row.email) }))
}

/**
 * Every address in a pasted block: one per line, or separated by commas,
 * semicolons or spaces, with or without `Name <address>` around it.
 */
export function addressesIn(text: string): { valid: string[]; invalid: string[] } {
  const valid = new Set<string>()
  const invalid: string[] = []
  for (const piece of text.split(/[\s,;]+/)) {
    const token = piece.replace(/^[<("']+|[>)"'.]+$/g, '')
    if (!token) continue
    if (!token.includes('@')) continue // a name beside an address
    const email = normalEmail(token)
    if (email) valid.add(email)
    else invalid.push(token.slice(0, 254))
  }
  return { valid: [...valid], invalid }
}

/**
 * Add addresses. One that is already there — subscribed or not — is
 * left exactly as it is, which is what keeps an unsubscribe standing.
 */
export async function addContacts(text: string, name: string, by: string) {
  const { valid, invalid } = addressesIn(text)
  if (valid.length === 0) throw new MailingRefusal(400, invalid.length ? 'None of those is an email address' : 'Paste at least one email address')
  if (valid.length > MAX_BROADCAST) throw new MailingRefusal(400, `Add at most ${MAX_BROADCAST} at a time`)
  const existing = await existingOf(valid)
  const fresh = valid.filter((email) => !existing.has(email))
  const label = name.replace(/\s+/g, ' ').trim().slice(0, 80) || null
  for (let i = 0; i < fresh.length; i += 500) {
    await upsert(
      db(),
      'mailing_list',
      fresh.slice(i, i + 500).map((email) => ({
        email,
        // A name only makes sense for one address at a time.
        name: valid.length === 1 ? label : null,
        source: 'admin',
        added_by: by,
      })),
      { ignore: true },
    )
  }
  return { added: fresh.length, already: valid.length - fresh.length, invalid }
}

/** Bring every member's address onto the list (unsubscribed ones stay unsubscribed). */
export async function importMembers(by: string) {
  const members = await select<{ email: string }>(db(), 'members', 'select=email&limit=10000')
  const emails = members.map((m) => m.email)
  const existing = await existingOf(emails)
  const fresh = emails.filter((email) => !existing.has(email))
  for (let i = 0; i < fresh.length; i += 500) {
    await upsert(
      db(),
      'mailing_list',
      fresh.slice(i, i + 500).map((email) => ({ email, source: 'member', added_by: by })),
      { ignore: true },
    )
  }
  return { added: fresh.length, already: emails.length - fresh.length, invalid: [] as string[] }
}

async function existingOf(emails: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  for (let i = 0; i < emails.length; i += 200) {
    const chunk = emails.slice(i, i + 200)
    const rows = await select<{ email: string }>(
      db(),
      'mailing_list',
      `select=email&email=in.(${chunk.map((e) => `"${enc(e)}"`).join(',')})`,
    )
    for (const row of rows) found.add(row.email)
  }
  return found
}

/**
 * Take addresses off the list. One that unsubscribed itself is kept as
 * the record not to write to it, so it cannot be re-added by accident.
 */
export async function removeContacts(emails: unknown) {
  const list = Array.isArray(emails) ? emails.map(normalEmail).filter((e): e is string => e !== null).slice(0, MAX_BROADCAST) : []
  if (list.length === 0) throw new MailingRefusal(400, 'Choose who to remove')
  for (let i = 0; i < list.length; i += 200) {
    const chunk = list.slice(i, i + 200).map((e) => `"${enc(e)}"`).join(',')
    await remove(db(), 'mailing_list', `email=in.(${chunk})&unsubscribed_at=is.null`)
  }
  return { removed: list.length }
}

/* ------------------------------------------------------------------ *
 * Sending
 * ------------------------------------------------------------------ */

/** The function's own address, for the unsubscribe link. */
function unsubscribeUrl(token: string): string {
  const base = (env('SUPABASE_URL') ?? '').replace(/\/$/, '')
  if (!base) throw new Error('SUPABASE_URL is missing from the function environment')
  return `${base}/functions/v1/inbound/unsubscribe?t=${enc(token)}`
}

/** One broadcast, addressed to one contact, with that contact's own way off the list. */
export function broadcastMail(contact: Pick<ContactRow, 'email' | 'unsubscribe_token'>, subject: string, body: string): OutgoingMail {
  const link = unsubscribeUrl(contact.unsubscribe_token)
  const why = 'You are getting this because you are on the AfroCoils mailing list.'
  const text = [body, '—', 'AfroCoils — Celebrating Every Coil.', `${why} Unsubscribe: ${link}`].join('\n\n')
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.55">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#E8D5C0;font-family:Arial,Helvetica,sans-serif;color:#5A2108">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px">
<p style="margin:0 0 20px;font-size:20px;font-weight:bold;color:#3F1708">${escapeHtml(subject)}</p>
${paragraphs}
<p style="margin:24px 0 0;font-size:13px;color:#7a4a32">AfroCoils — Celebrating Every Coil.</p>
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#7a4a32">${escapeHtml(why)} <a href="${escapeHtml(link)}" style="color:#5A2108">Unsubscribe</a></p>
</td></tr></table></body></html>`
  return {
    from: FROM_HELLO,
    to: contact.email,
    subject,
    text,
    html,
    replyTo: 'hello@afrocoils.app',
    headers: {
      'List-Unsubscribe': `<${link}>, <mailto:hello@afrocoils.app?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Send one message to every subscribed contact (`to: 'all'`) or to the
 * ones ticked. Addresses not on the list, or unsubscribed, are skipped
 * and counted, never sent to. A batch that fails is counted as failed
 * and the rest still go; the broadcast is logged either way.
 */
export async function sendBroadcast(body: Record<string, unknown>, by: string) {
  const subject = typeof body.subject === 'string' ? body.subject.replace(/\s+/g, ' ').trim() : ''
  const message = typeof body.text === 'string' ? body.text.replace(/\r\n/g, '\n').trim() : ''
  if (!subject || subject.length > 200) throw new MailingRefusal(400, 'Write a subject of up to 200 characters')
  if (!message || message.length > 20_000) throw new MailingRefusal(400, 'Write a message of up to 20,000 characters')

  const subscribed = await select<ContactRow>(
    db(),
    'mailing_list',
    `select=email,unsubscribe_token&unsubscribed_at=is.null&order=added_at.asc&limit=${MAX_BROADCAST + 1}`,
  )
  let recipients: ContactRow[]
  let skipped = 0
  if (body.to === 'all') {
    if (subscribed.length > MAX_BROADCAST) {
      throw new MailingRefusal(400, `The list has more than ${MAX_BROADCAST} people; send to a selection`)
    }
    recipients = subscribed
  } else {
    const wanted = new Set(
      (Array.isArray(body.to) ? body.to : []).map(normalEmail).filter((e): e is string => e !== null),
    )
    if (wanted.size === 0) throw new MailingRefusal(400, 'Choose who to send it to')
    if (wanted.size > MAX_BROADCAST) throw new MailingRefusal(400, `Send to at most ${MAX_BROADCAST} at once`)
    recipients = subscribed.filter((c) => wanted.has(c.email))
    skipped = wanted.size - recipients.length
  }
  if (recipients.length === 0) throw new MailingRefusal(400, 'Nobody chosen is subscribed')

  let sent = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i += BATCH) {
    const chunk = recipients.slice(i, i + BATCH)
    try {
      await sendBatch(chunk.map((c) => broadcastMail(c, subject, message)))
      sent += chunk.length
    } catch (error) {
      console.error('[mailing] a batch failed', error)
      failed += chunk.length
    }
    // Resend allows a few requests a second.
    if (i + BATCH < recipients.length) await pause(600)
  }

  const row = await insertReturning<{ id: number }>(db(), 'broadcasts', {
    subject,
    body: message,
    sent_by: by,
    recipients: sent,
    failed,
  }).catch((error) => {
    console.error('[mailing] could not log the broadcast', error)
    return undefined
  })
  return { id: row?.id ?? null, sent, failed, skipped }
}

export function listBroadcasts() {
  return select(db(), 'broadcasts', 'select=id,subject,body,sent_by,sent_at,recipients,failed&order=sent_at.desc&limit=100')
}

/* ------------------------------------------------------------------ *
 * Unsubscribing
 * ------------------------------------------------------------------ */

const TOKEN = /^[0-9a-f]{64}$/

/** Mark the contact holding `token` unsubscribed. False: no such token. Idempotent. */
export async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token || !TOKEN.test(token)) return false
  const [row] = await select<{ email: string; unsubscribed_at: string | null }>(
    db(),
    'mailing_list',
    `unsubscribe_token=eq.${token}&select=email,unsubscribed_at&limit=1`,
  )
  if (!row) return false
  if (!row.unsubscribed_at) {
    await patch(db(), 'mailing_list', `unsubscribe_token=eq.${token}&unsubscribed_at=is.null`, {
      unsubscribed_at: new Date().toISOString(),
    })
  }
  return true
}
