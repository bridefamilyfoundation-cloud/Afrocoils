import { MEMBERSHIP_GRACE_DAYS } from '../../../src/lib/types.ts'
import { BodyTooLarge, readJson } from '../_shared/body.ts'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import {
  KNOWN_MAILBOXES,
  MAILBOX_PATTERN,
  mailboxAddress,
  mailboxFrom,
  replyMailbox,
  sendMail,
  type Mailbox,
} from '../_shared/email.ts'
import { env, serve } from '../_shared/env.ts'
import { checkLimits, limitResponse } from '../_shared/limits.ts'
import { db, getMember, laterOf, saveMember } from '../_shared/members.ts'
import { appendNote, closeAccess } from '../_shared/membership.ts'
import { insert, insertReturning, patch, select, signedPhotoUrl } from '../_shared/supabase.ts'
import { bearer, normalEmail } from '../_shared/token.ts'

/**
 * What the admin site (admin/, at admin.afrocoils.app) reads and writes.
 *
 * Every route needs `Authorization: Bearer <admin token>` from
 * `auth/verify` with purpose `admin`, *and* the address must still be in
 * ADMIN_EMAILS — taking someone off that list ends their session on the
 * next request rather than when the token runs out.
 *
 * GET  overview                       counts for the dashboard
 * GET  members?q=                     members, newest change first
 * POST members {email, action, ...}   grant | revoke | note
 * GET  payments?email=                Paystack charges
 * GET  mailboxes                      every @afrocoils.app address with mail, and its counts
 * GET  threads?status=&mailbox=       conversations, all or one mailbox's
 * GET  thread?id=                     one conversation; marks it read
 * POST reply {thread, text}           answer from the mailbox it came to
 * POST compose {to, subject, text, mailbox}
 * POST thread-status {thread, status}
 * GET  submissions?review=            the style queue, photos signed for an hour
 * POST submission {id, review, note}
 * GET  questions?outcome=&reviewed=   the Ask log
 * POST questions {ids, reviewed}
 */

const enc = encodeURIComponent

function admins(): Set<string> {
  return new Set(
    (env('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => normalEmail(e))
      .filter((e): e is string => e !== null),
  )
}

class Refusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function input(req: Request): Promise<Record<string, unknown>> {
  const raw = await readJson(req, 64 * 1024).catch((error) => {
    if (error instanceof BodyTooLarge) throw new Refusal(413, 'Too large')
    throw error
  })
  if (typeof raw !== 'object' || raw === null) throw new Refusal(400, 'Expected a JSON body')
  return raw as Record<string, unknown>
}

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

/* ------------------------------------------------------------------ *
 * Overview
 * ------------------------------------------------------------------ */

/** PostgREST's exact count, from the Content-Range header of a HEAD request. */
async function count(table: string, filter: string): Promise<number> {
  const config = db()
  const headers: Record<string, string> = { apikey: config.serviceKey, Prefer: 'count=exact' }
  if (config.serviceKey.startsWith('eyJ')) headers.Authorization = `Bearer ${config.serviceKey}`
  const response = await fetch(`${config.url}/rest/v1/${table}?${filter}&limit=1`, { method: 'HEAD', headers })
  const range = response.headers.get('content-range') ?? ''
  return Number(range.split('/')[1]) || 0
}

async function overview() {
  const openFrom = new Date(Date.now() - MEMBERSHIP_GRACE_DAYS * 86_400_000).toISOString()
  const [members, paying, pending, open, unread, unanswered] = await Promise.all([
    count('members', 'select=email'),
    count('members', `select=email&paid_until=gt.${openFrom}`),
    count('submissions', 'select=id&review=eq.Pending'),
    count('support_messages', 'select=id&direction=eq.in&status=eq.open'),
    count('support_messages', 'select=id&direction=eq.in&read=eq.false'),
    count('ask_questions', 'select=id&outcome=eq.none&reviewed=eq.false'),
  ])
  return { members, paying, pending, open, unread, unanswered }
}

/* ------------------------------------------------------------------ *
 * Members and payments
 * ------------------------------------------------------------------ */

async function listMembers(url: URL) {
  const q = text(url.searchParams.get('q'), 100).toLowerCase().replace(/[*,()]/g, '')
  const filter = q ? `&email=ilike.*${enc(q)}*` : ''
  return select(db(), 'members', `select=*&order=updated_at.desc&limit=500${filter}`)
}

async function changeMember(body: Record<string, unknown>, by: string) {
  const email = normalEmail(body.email)
  if (!email) throw new Refusal(400, 'Not an email address')
  const action = body.action

  if (action === 'grant') {
    const months = Number(body.months)
    if (!Number.isInteger(months) || months < 1 || months > 24) throw new Refusal(400, 'Months must be 1–24')
    const member = await getMember(email)
    const from = new Date(laterOf(member?.paid_until, new Date().toISOString())!)
    from.setUTCMonth(from.getUTCMonth() + months)
    return saveMember(email, {
      status: 'active',
      paid_until: from.toISOString(),
      source: member?.paystack_subscription ? 'paystack' : 'manual',
      note: appendNote(member?.note, `${by}: +${months} month${months === 1 ? '' : 's'}`),
    })
  }

  if (action === 'revoke') {
    const member = await getMember(email)
    if (!member) throw new Refusal(404, 'No such member')
    // Stops the card, ends paid time *and* any running trial.
    return closeAccess(member, `${by}: revoked`)
  }

  if (action === 'note') {
    return saveMember(email, { note: text(body.note, 500) || null })
  }
  throw new Refusal(400, 'Unknown action')
}


function listPayments(url: URL) {
  const email = normalEmail(url.searchParams.get('email'))
  return select(db(), 'payments', `select=*&order=paid_at.desc&limit=500${email ? `&email=eq.${enc(email)}` : ''}`)
}

/* ------------------------------------------------------------------ *
 * Mail: one inbox per @afrocoils.app address
 * ------------------------------------------------------------------ */

interface Message {
  id: number
  thread_id: number | null
  direction: 'in' | 'out'
  mailbox: Mailbox
  from_address: string
  to_address: string
  subject: string
  body: string
  message_id: string | null
  status: 'open' | 'closed'
  read: boolean
  sent_by: string | null
  created_at: string
}

interface ThreadSummary {
  id: number
  mailbox: Mailbox
  with: string
  subject: string
  status: 'open' | 'closed'
  unread: boolean
  count: number
  lastISO: string
  preview: string
}

/** Every conversation, newest first, built from the latest 2,000 messages. */
async function allThreads(): Promise<ThreadSummary[]> {
  const rows = await select<Message>(
    db(),
    'support_messages',
    'select=id,thread_id,direction,mailbox,from_address,to_address,subject,status,read,created_at,body&order=created_at.desc&limit=2000',
  )
  const threads = new Map<number, ThreadSummary>()
  for (const row of rows) {
    const id = row.thread_id ?? row.id
    const t = threads.get(id)
    const other = row.direction === 'in' ? row.from_address : row.to_address
    if (!t) {
      threads.set(id, {
        id,
        mailbox: row.mailbox,
        with: other,
        subject: row.subject,
        status: row.direction === 'in' ? row.status : 'open',
        unread: row.direction === 'in' && !row.read,
        count: 1,
        lastISO: row.created_at,
        preview: row.body.slice(0, 140),
      })
    } else {
      t.count++
      if (row.direction === 'in') {
        t.unread ||= !row.read
        t.status = row.status
      }
    }
  }
  return [...threads.values()]
}

async function listThreads(url: URL) {
  const status = url.searchParams.get('status') ?? 'open'
  const mailbox = url.searchParams.get('mailbox') ?? ''
  return (await allThreads()).filter(
    (t) => (status === 'all' || t.status === status) && (!mailbox || t.mailbox === mailbox),
  )
}

/** The named mailboxes (always), then any other address that has had mail, busiest first. */
async function listMailboxes() {
  const counts = new Map<Mailbox, { unread: number; open: number; total: number }>()
  for (const name of Object.keys(KNOWN_MAILBOXES)) counts.set(name, { unread: 0, open: 0, total: 0 })
  for (const t of await allThreads()) {
    const c = counts.get(t.mailbox) ?? { unread: 0, open: 0, total: 0 }
    c.total++
    if (t.unread) c.unread++
    if (t.status === 'open') c.open++
    counts.set(t.mailbox, c)
  }
  const known = Object.keys(KNOWN_MAILBOXES)
  return [...counts.entries()]
    .sort(([a, x], [b, y]) => {
      const ia = known.indexOf(a)
      const ib = known.indexOf(b)
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      return y.total - x.total || a.localeCompare(b)
    })
    .map(([mailbox, c]) => ({
      mailbox,
      address: mailboxAddress(mailbox),
      known: mailbox in KNOWN_MAILBOXES,
      repliesFrom: mailboxAddress(replyMailbox(mailbox)),
      ...c,
    }))
}

async function thread(url: URL) {
  const id = Number(url.searchParams.get('id'))
  if (!Number.isInteger(id)) throw new Refusal(400, 'Bad thread id')
  const messages = await select<Message>(db(), 'support_messages', `thread_id=eq.${id}&select=*&order=created_at.asc`)
  await patch(db(), 'support_messages', `thread_id=eq.${id}&direction=eq.in&read=eq.false`, { read: true })
  return messages
}

async function reply(body: Record<string, unknown>, by: string) {
  const id = Number(body.thread)
  const message = text(body.text, 20_000)
  if (!Number.isInteger(id) || !message) throw new Refusal(400, 'A thread and a message are needed')

  const messages = await select<Message>(db(), 'support_messages', `thread_id=eq.${id}&select=*&order=created_at.desc`)
  const last = messages.find((m) => m.direction === 'in')
  if (!last) throw new Refusal(404, 'No incoming message in that thread')

  const subject = /^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject || 'your message'}`
  const resendId = await sendMail({
    from: mailboxFrom(last.mailbox),
    to: last.from_address,
    subject,
    text: message,
    inReplyTo: last.message_id ?? undefined,
  })
  await insert(db(), 'support_messages', [
    {
      resend_id: resendId || null,
      direction: 'out',
      mailbox: last.mailbox,
      from_address: mailboxAddress(replyMailbox(last.mailbox)),
      to_address: last.from_address,
      subject,
      body: message,
      thread_id: id,
      read: true,
      sent_by: by,
    },
  ])
  return { ok: true }
}

async function compose(body: Record<string, unknown>, by: string) {
  const to = normalEmail(body.to)
  const subject = text(body.subject, 300)
  const message = text(body.text, 20_000)
  const asked = text(body.mailbox, 64).toLowerCase() || 'support'
  if (!MAILBOX_PATTERN.test(asked)) throw new Refusal(400, 'Not a mailbox')
  const mailbox = replyMailbox(asked)
  if (!(mailbox in KNOWN_MAILBOXES)) {
    // Any other address may be written from once it has had mail, so a typo
    // cannot invent a new sender.
    const [seen] = await select(db(), 'support_messages', `mailbox=eq.${enc(mailbox)}&select=id&limit=1`)
    if (!seen) throw new Refusal(400, `${mailboxAddress(mailbox)} has no mail yet`)
  }
  if (!to || !subject || !message) throw new Refusal(400, 'To, subject and message are needed')

  const resendId = await sendMail({ from: mailboxFrom(mailbox), to, subject, text: message })
  const row = await insertReturning<{ id: number }>(db(), 'support_messages', {
    resend_id: resendId || null,
    direction: 'out',
    mailbox,
    from_address: mailboxAddress(mailbox),
    to_address: to,
    subject,
    body: message,
    read: true,
    sent_by: by,
  })
  if (row) await patch(db(), 'support_messages', `id=eq.${row.id}`, { thread_id: row.id })
  return { ok: true }
}

async function threadStatus(body: Record<string, unknown>) {
  const id = Number(body.thread)
  const status = body.status === 'closed' ? 'closed' : 'open'
  if (!Number.isInteger(id)) throw new Refusal(400, 'Bad thread id')
  await patch(db(), 'support_messages', `thread_id=eq.${id}&direction=eq.in`, { status })
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 * Style submissions
 * ------------------------------------------------------------------ */

interface SubmissionRow {
  id: string
  received_at: string
  review: 'Pending' | 'Approved' | 'Rejected'
  body: Record<string, unknown>
  photo_keys: string[]
  reviewed_at: string | null
  reviewer_note: string | null
}

async function listSubmissions(url: URL) {
  const review = url.searchParams.get('review') ?? 'Pending'
  const filter = ['Pending', 'Approved', 'Rejected'].includes(review) ? `&review=eq.${review}` : ''
  const rows = await select<SubmissionRow>(db(), 'submissions', `select=*&order=received_at.desc&limit=100${filter}`)
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      photos: await Promise.all(
        (row.photo_keys ?? []).map((key) => signedPhotoUrl(db(), key, 3600).catch(() => null)),
      ),
    })),
  )
}

async function reviewSubmission(body: Record<string, unknown>, by: string) {
  const id = text(body.id, 100)
  const review = body.review
  if (!id || (review !== 'Approved' && review !== 'Rejected' && review !== 'Pending')) {
    throw new Refusal(400, 'An id and Approved, Rejected or Pending are needed')
  }
  const note = text(body.note, 1000)
  await patch(db(), 'submissions', `id=eq.${enc(id)}`, {
    review,
    reviewed_at: review === 'Pending' ? null : new Date().toISOString(),
    reviewer_note: note ? `${by}: ${note}` : null,
  })
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 * Ask questions
 * ------------------------------------------------------------------ */

function listQuestions(url: URL) {
  const outcome = text(url.searchParams.get('outcome'), 20)
  const reviewed = url.searchParams.get('reviewed')
  let filter = 'select=*&order=asked_at.desc&limit=500'
  if (/^[a-z-]+$/.test(outcome)) filter += `&outcome=eq.${outcome}`
  if (reviewed === 'true' || reviewed === 'false') filter += `&reviewed=eq.${reviewed}`
  return select(db(), 'ask_questions', filter)
}

async function markQuestions(body: Record<string, unknown>) {
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => Number.isInteger(id)).slice(0, 500) : []
  if (ids.length === 0) throw new Refusal(400, 'No ids')
  await patch(db(), 'ask_questions', `id=in.(${ids.join(',')})`, { reviewed: body.reviewed !== false })
  return { ok: true }
}

/* ------------------------------------------------------------------ */

serve(async (req) => {
  const origin = req.headers.get('origin') ?? undefined
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })

  const url = new URL(req.url)
  const route = url.pathname.split('/').pop()
  try {
    const limit = await checkLimits(req, 'admin')
    if (!limit.allowed) return limitResponse(limit, origin)

    const session = await bearer(req, 'admin')
    if (!session || !admins().has(session.sub)) throw new Refusal(401, 'Signed out')
    const by = session.sub

    let result: unknown
    if (req.method === 'GET') {
      if (route === 'overview') result = await overview()
      else if (route === 'members') result = await listMembers(url)
      else if (route === 'payments') result = await listPayments(url)
      else if (route === 'mailboxes') result = await listMailboxes()
      else if (route === 'threads') result = await listThreads(url)
      else if (route === 'thread') result = await thread(url)
      else if (route === 'submissions') result = await listSubmissions(url)
      else if (route === 'questions') result = await listQuestions(url)
      else throw new Refusal(404, 'Not found')
    } else if (req.method === 'POST') {
      const body = await input(req)
      if (route === 'members') result = await changeMember(body, by)
      else if (route === 'reply') result = await reply(body, by)
      else if (route === 'compose') result = await compose(body, by)
      else if (route === 'thread-status') result = await threadStatus(body)
      else if (route === 'submission') result = await reviewSubmission(body, by)
      else if (route === 'questions') result = await markQuestions(body)
      else throw new Refusal(404, 'Not found')
    } else {
      throw new Refusal(405, 'Method not allowed')
    }
    return jsonResponse(result, 200, origin)
  } catch (error) {
    if (error instanceof Refusal) return jsonResponse({ error: error.message }, error.status, origin)
    console.error(`[admin] ${route} failed`, error)
    return jsonResponse({ error: error instanceof Error ? error.message.slice(0, 300) : 'Failed' }, 500, origin)
  }
})
