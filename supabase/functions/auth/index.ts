import type {
  AdminSessionResponse,
  CodePurpose,
  MembershipResponse,
} from '../../../src/lib/types.ts'
import { membershipOpen } from '../../../src/lib/types.ts'
import { BodyTooLarge, readJson } from '../_shared/body.ts'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { codeMail, sendMail } from '../_shared/email.ts'
import { env, serve } from '../_shared/env.ts'
import { checkKeyLimit, checkLimits, limitResponse } from '../_shared/limits.ts'
import { db, getMember, laterOf, saveMember, type MemberRow } from '../_shared/members.ts'
import { fetchSubscription, memberStatus, planPrice } from '../_shared/paystack.ts'
import { remove, rpc, select, upsert } from '../_shared/supabase.ts'
import { bearer, hashCode, newCode, normalEmail, sameBytes, signToken } from '../_shared/token.ts'

/**
 * Signing in by email.
 *
 * - `POST auth/request-code` `{ email, purpose }` sends a six-digit code
 *   from no-reply@afrocoils.app. Always 204 — whether or not the address
 *   is a member, or an admin — so the route cannot be used to find out
 *   who is.
 * - `POST auth/verify` `{ email, code, purpose }` checks it. A member
 *   gets a token and their membership; an admin gets a twelve-hour
 *   session. Ten minutes and five tries per code.
 * - `POST auth/status` with `Authorization: Bearer <member token>`
 *   answers how long that address is paid up to, with a fresh token.
 *   The phone asks on sign-in and at most twice a day after that.
 *
 * Confirming an address is not paying for it: anyone can sign in, and
 * the answer says `none` until the billing webhook has recorded a
 * payment. Deployed with JWT verification off, like the other routes:
 * the app holds no Supabase key, and these tokens are our own.
 */

const CODE_MINUTES = 10
const MAX_ATTEMPTS = 5

function adminEmails(): Set<string> {
  return new Set(
    (env('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => normalEmail(e))
      .filter((e): e is string => e !== null),
  )
}

function purposeOf(value: unknown): CodePurpose | null {
  return value === 'member' || value === 'admin' ? value : null
}

async function body(req: Request): Promise<Record<string, unknown> | null | undefined> {
  const raw = await readJson(req, 4 * 1024).catch((error) => {
    if (error instanceof BodyTooLarge) return undefined
    throw error
  })
  if (raw === undefined) return undefined
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null
}

/* ------------------------------------------------------------------ */

async function requestCode(req: Request, origin?: string): Promise<Response> {
  const limit = await checkLimits(req, 'auth-code')
  if (!limit.allowed) return limitResponse(limit, origin)

  const input = await body(req)
  if (input === undefined) return jsonResponse({ error: 'Too large' }, 413, origin)
  const email = normalEmail(input?.email)
  const purpose = purposeOf(input?.purpose)
  if (!email || !purpose) return jsonResponse({ error: 'That doesn’t look like an email address.' }, 400, origin)

  // Three codes per address per quarter hour, from anywhere: someone
  // typing a stranger's address cannot fill their inbox.
  if (!(await checkKeyLimit(`code:${email}`, 3, 900))) {
    return jsonResponse({ error: 'A code was sent a moment ago. Check your inbox and spam folder, or try again in a few minutes.' }, 429, origin)
  }

  const silent = new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (purpose === 'admin' && !adminEmails().has(email)) return silent

  const code = newCode()
  try {
    await upsert(db(), 'login_codes', [
      {
        email,
        purpose,
        code_hash: await hashCode(email, purpose, code),
        expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
        attempts: 0,
        created_at: new Date().toISOString(),
      },
    ])
    await sendMail(codeMail(email, code, purpose))
  } catch (error) {
    console.error('[auth] could not issue a code', error)
    return jsonResponse({ error: 'We couldn’t send the code just now. Try again in a minute.' }, 502, origin)
  }
  return silent
}

/* ------------------------------------------------------------------ */

interface CodeRow {
  code_hash: string
  expires_at: string
  attempts: number
}

async function verify(req: Request, origin?: string): Promise<Response> {
  const limit = await checkLimits(req, 'auth-verify')
  if (!limit.allowed) return limitResponse(limit, origin)

  const input = await body(req)
  if (input === undefined) return jsonResponse({ error: 'Too large' }, 413, origin)
  const email = normalEmail(input?.email)
  const purpose = purposeOf(input?.purpose)
  const code = typeof input?.code === 'string' ? input.code.replace(/\D/g, '') : ''
  if (!email || !purpose || code.length !== 6) {
    return jsonResponse({ error: 'Enter the six digits from the email.' }, 400, origin)
  }

  const key = `email=eq.${encodeURIComponent(email)}&purpose=eq.${purpose}`
  const [row] = await select<CodeRow>(db(), 'login_codes', `${key}&limit=1`)
  const expired = { error: 'That code has expired. Ask for a new one.' }
  if (!row || Date.parse(row.expires_at) < Date.now()) return jsonResponse(expired, 400, origin)

  // Counted before comparing, atomically, so parallel guesses cannot
  // each see a fresh counter.
  const attempts = await rpc<number | null>(db(), 'bump_login_attempt', { p_email: email, p_purpose: purpose })
  if (attempts === null || Number(attempts) > MAX_ATTEMPTS) {
    await remove(db(), 'login_codes', key)
    return jsonResponse({ error: 'Too many tries. Ask for a new code.' }, 400, origin)
  }

  const given = new TextEncoder().encode(await hashCode(email, purpose, code))
  if (!sameBytes(given, new TextEncoder().encode(row.code_hash))) {
    return jsonResponse({ error: 'That code isn’t right. Check the email and try again.' }, 400, origin)
  }
  await remove(db(), 'login_codes', key)

  if (purpose === 'admin') {
    if (!adminEmails().has(email)) return jsonResponse({ error: 'Not an admin address.' }, 403, origin)
    const { token, exp } = await signToken(email, 'admin')
    const session: AdminSessionResponse = { email, token, expiresISO: new Date(exp * 1000).toISOString() }
    return jsonResponse(session, 200, origin)
  }

  return jsonResponse(await membership(email), 200, origin)
}

/* ------------------------------------------------------------------ */

async function status(req: Request, origin?: string): Promise<Response> {
  const limit = await checkLimits(req, 'auth-status')
  if (!limit.allowed) return limitResponse(limit, origin)

  const session = await bearer(req, 'member')
  if (!session) return jsonResponse({ error: 'Signed out. Sign in again with your email.' }, 401, origin)
  return jsonResponse(await membership(session.sub), 200, origin)
}

/**
 * What the phone is told about an address, with a fresh token.
 *
 * Self-healing: if a Paystack member looks lapsed, Paystack itself is
 * asked before the answer goes back, so a webhook that never arrived
 * costs a member nothing.
 */
async function membership(email: string): Promise<MembershipResponse> {
  let member: MemberRow | undefined = await getMember(email)

  if (member?.paystack_subscription && !membershipOpen(member.paid_until)) {
    try {
      const sub = await fetchSubscription(member.paystack_subscription)
      member = await saveMember(email, {
        status: memberStatus(sub.status),
        paid_until: laterOf(member.paid_until, sub.next_payment_date),
      })
    } catch (error) {
      console.error('[auth] subscription refresh failed', error)
    }
  }

  if (member) {
    // Best-effort: the admin's "last seen" column, nothing more.
    void saveMember(email, { last_seen_at: new Date().toISOString() }).catch(() => undefined)
  }

  const paidUntilISO = member?.paid_until ? new Date(member.paid_until).toISOString() : null
  const open = membershipOpen(paidUntilISO)
  const { token } = await signToken(email, 'member')
  return {
    email,
    token,
    status: member?.status ?? 'none',
    paidUntilISO,
    price: open ? undefined : await planPrice(),
  }
}

/* ------------------------------------------------------------------ */

serve(async (req) => {
  const origin = req.headers.get('origin') ?? undefined
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, origin)

  const route = new URL(req.url).pathname.split('/').pop()
  try {
    if (route === 'request-code') return await requestCode(req, origin)
    if (route === 'verify') return await verify(req, origin)
    if (route === 'status') return await status(req, origin)
    return jsonResponse({ error: 'Not found' }, 404, origin)
  } catch (error) {
    console.error(`[auth] ${route} failed`, error)
    return jsonResponse({ error: 'Something went wrong on our side. Try again in a minute.' }, 500, origin)
  }
})
