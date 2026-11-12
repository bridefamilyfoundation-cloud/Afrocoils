/**
 * Mail, through Resend: sign-in codes out, support mail in and out.
 *
 * RESEND_API_KEY lives in the function environment (`supabase secrets
 * set`) and nowhere else. The domain afrocoils.app is verified in Resend
 * (DKIM, SPF on the `send` subdomain, an MX for receiving); the DNS
 * records are listed in docs/membership-setup.md.
 *
 * Plain `fetch` to the REST API, like everything else here.
 */
import { env } from './env.ts'

const API = 'https://api.resend.com'

/** Who the app's own mail comes from. */
export const FROM_NOREPLY = 'AfroCoils <no-reply@afrocoils.app>'

/** The two addresses people write to, and that the admin replies from. */
export const MAILBOXES = {
  support: 'AfroCoils Support <support@afrocoils.app>',
  hello: 'AfroCoils <hello@afrocoils.app>',
} as const
export type Mailbox = keyof typeof MAILBOXES

function apiKey(): string {
  const key = env('RESEND_API_KEY')
  if (!key) throw new Error('RESEND_API_KEY is missing from the function environment')
  return key
}

export interface OutgoingMail {
  from: string
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  /** Threading headers, for a reply. */
  inReplyTo?: string
}

/** Send one message; resolves to Resend's id for it. */
export async function sendMail(mail: OutgoingMail): Promise<string> {
  const headers: Record<string, string> = {}
  if (mail.inReplyTo) {
    headers['In-Reply-To'] = mail.inReplyTo
    headers.References = mail.inReplyTo
  }
  const response = await fetch(`${API}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: mail.from,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      reply_to: mail.replyTo,
      headers: Object.keys(headers).length ? headers : undefined,
    }),
  })
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300)
    throw new Error(`Resend send failed (${response.status}): ${detail}`)
  }
  const body = (await response.json()) as { id?: string }
  return body.id ?? ''
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The sign-in code email. Short, and the code is the first thing in it. */
export function codeMail(to: string, code: string, purpose: 'member' | 'admin'): OutgoingMail {
  const what = purpose === 'admin' ? 'the AfroCoils admin site' : 'AfroCoils'
  const text = [
    `Your code for ${what} is ${code}`,
    '',
    'It works for ten minutes. If you did not ask for it, ignore this email: nothing happens without the code.',
    '',
    'AfroCoils — Celebrating Every Coil.',
    'Questions? Reply to support@afrocoils.app.',
  ].join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#E8D5C0;font-family:Arial,Helvetica,sans-serif;color:#5A2108">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:440px;background:#ffffff;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px">
<p style="margin:0 0 8px;font-size:15px">Your code for ${escape(what)}</p>
<p style="margin:0 0 24px;font-size:36px;font-weight:bold;letter-spacing:8px;color:#3F1708">${escape(code)}</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.5">It works for ten minutes. If you did not ask for it, ignore this email: nothing happens without the code.</p>
<p style="margin:0;font-size:13px;color:#7a4a32">AfroCoils — Celebrating Every Coil.<br>Questions? Write to <a href="mailto:support@afrocoils.app" style="color:#E2583E">support@afrocoils.app</a>.</p>
</td></tr></table></td></tr></table></body></html>`
  return {
    from: FROM_NOREPLY,
    to,
    subject: `${code} is your AfroCoils code`,
    text,
    html,
    replyTo: 'support@afrocoils.app',
  }
}

/* ------------------------------------------------------------------ *
 * Membership notices
 * ------------------------------------------------------------------ */

/**
 * The four reminders the daily run sends (billing/reminders), each once:
 *
 * - `trial-ending`: the free trial ends within a day.
 * - `ending`: a membership that will not renew ends within three days.
 * - `renewing`: a plan renews within three days, and for how much.
 * - `ended`: access has just closed.
 *
 * Service mail about the membership, nothing else: no offers, no
 * newsletter. The privacy policy names exactly these.
 */
export type NoticeKind = 'trial-ending' | 'ending' | 'renewing' | 'ended'

export interface NoticeDetails {
  /** The date the notice is about, already written out ("14 November 2026"). */
  date: string
  /** "6 Months", for a plan. */
  planLabel?: string
  /** "₦7,500", for a renewal. */
  amount?: string
}

const NOTICE: Record<NoticeKind, (d: NoticeDetails) => { subject: string; lines: string[] }> = {
  'trial-ending': (d) => ({
    subject: 'Your AfroCoils free trial ends tomorrow',
    lines: [
      `Your three-day free trial ends on ${d.date}.`,
      'To keep AfroCoils open, choose a plan in the app: Monthly, 6 Months or Annual. Open the app and tap Choose a plan on the banner, or go to My Hair Profile → Membership.',
      'If you do nothing, the app simply locks. Your hair profile, history and photos stay on your phone.',
    ],
  }),
  ending: (d) => ({
    subject: `Your AfroCoils membership ends on ${d.date}`,
    lines: [
      `Your ${d.planLabel ? `${d.planLabel} ` : ''}membership is not set to renew, and ends on ${d.date}.`,
      'To keep the app open, choose a plan in the app before then: My Hair Profile → Membership → Choose a plan.',
      'Your hair profile, history and photos stay on your phone either way.',
    ],
  }),
  renewing: (d) => ({
    subject: `Your AfroCoils membership renews on ${d.date}`,
    lines: [
      `Your ${d.planLabel ?? ''} membership renews on ${d.date}${d.amount ? `, and Paystack will charge ${d.amount} to your card` : ''}.`,
      'Nothing to do if you want to carry on. To change the card or cancel, open the app: My Hair Profile → Membership → Manage or cancel. Cancelling keeps the app open to the end of the period you have paid for.',
    ],
  }),
  ended: (d) => ({
    subject: 'Your AfroCoils membership has ended',
    lines: [
      `Your access to AfroCoils ended on ${d.date}, so the app is now locked.`,
      'Your hair profile, history and photos are still on your phone, and open again as soon as you choose a plan in the app.',
    ],
  }),
}

export function noticeMail(to: string, kind: NoticeKind, details: NoticeDetails): OutgoingMail {
  const { subject, lines } = NOTICE[kind](details)
  const footer = 'AfroCoils — Celebrating Every Coil.'
  const text = [...lines, footer, 'Questions? Reply to support@afrocoils.app.'].join('\n\n')
  const html = `<!doctype html><html><body style="margin:0;background:#E8D5C0;font-family:Arial,Helvetica,sans-serif;color:#5A2108">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:440px;background:#ffffff;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px">
<p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#3F1708">${escape(subject)}</p>
${lines.map((line) => `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">${escape(line)}</p>`).join('\n')}
<p style="margin:0;font-size:13px;color:#7a4a32">${escape(footer)}<br>Questions? Write to <a href="mailto:support@afrocoils.app" style="color:#E2583E">support@afrocoils.app</a>.</p>
</td></tr></table></td></tr></table></body></html>`
  return { from: FROM_NOREPLY, to, subject, text, html, replyTo: 'support@afrocoils.app' }
}

/* ------------------------------------------------------------------ *
 * Receiving
 * ------------------------------------------------------------------ */

export interface ReceivedEmail {
  id: string
  from: string
  to: string[]
  subject: string
  text: string | null
  html: string | null
  message_id?: string
  headers?: Record<string, string>
}

/** The full message: Resend's `email.received` webhook carries only the envelope. */
export async function fetchReceived(id: string): Promise<ReceivedEmail> {
  const response = await fetch(`${API}/emails/receiving/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  })
  if (!response.ok) throw new Error(`Resend receive fetch failed (${response.status})`)
  return (await response.json()) as ReceivedEmail
}

/**
 * HTML mail reduced to text, so the admin site never renders a
 * stranger's markup. Crude on purpose: drop script, style and head
 * wholesale, turn block ends into line breaks, strip every other tag,
 * decode the handful of entities mail actually uses.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Resend signs webhooks the Svix way: HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${body}`, keyed on the base64 part of the
 * `whsec_…` secret, sent as space-separated `v1,<base64>` signatures.
 * Rejects anything older than five minutes so a captured request cannot
 * be replayed later.
 */
export async function verifyResendWebhook(req: Request, body: string): Promise<boolean> {
  const secret = env('RESEND_WEBHOOK_SECRET')
  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signatures = req.headers.get('svix-signature')
  if (!secret || !id || !timestamp || !signatures) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const raw = atob(secret.replace(/^whsec_/, ''))
  const keyBytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) keyBytes[i] = raw.charCodeAt(i)
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)),
  )
  let expected = ''
  for (const b of mac) expected += String.fromCharCode(b)
  expected = btoa(expected)

  return signatures.split(' ').some((entry) => {
    const [version, value] = entry.split(',')
    if (version !== 'v1' || !value || value.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < value.length; i++) diff |= value.charCodeAt(i) ^ expected.charCodeAt(i)
    return diff === 0
  })
}
