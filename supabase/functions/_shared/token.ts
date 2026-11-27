/**
 * Sessions, access tokens and refresh tokens.
 *
 * Every sign-in is a row in `sessions` (migration 0010). The client holds
 * two things:
 *
 * - an **access token**, `base64url(payload).base64url(HMAC-SHA256)`,
 *   keyed on AUTH_SECRET, good for fifteen minutes and naming its session
 *   (`sid`). `bearer()` checks the signature *and* that the session is
 *   still live, so signing out ends it on the server at once, not when
 *   the token runs out.
 * - a **refresh token**, `<sid>.<32 random bytes>`, stored only as an
 *   HMAC and replaced on every use (`refreshSession`). Presenting the one
 *   just replaced is answered for two minutes — a retry after a lost
 *   response — and after that revokes the session, because it means a
 *   copy is being replayed.
 *
 * A member's session lasts 180 days from its last refresh, so a phone
 * that opens the app now and then stays signed in. An admin's is twelve
 * hours from sign-in, whatever happens.
 *
 * Not a JWT library: two HMACs and a JSON parse are less code than the
 * dependency, and there is one algorithm, so there is no `alg` header to
 * confuse. No payment state rides on a token: whether an address is paid
 * up is read from `members` on every status check.
 */
import { env } from './env.ts'
import { db } from './members.ts'
import { insertReturning, patch, remove, select } from './supabase.ts'
import type { CodePurpose, SessionTokens } from '../../../src/lib/types.ts'

/** A session's tokens, and the address it belongs to. */
export type Session = SessionTokens & { email: string }

export interface TokenPayload {
  /** The confirmed email, lower-cased. */
  sub: string
  kind: CodePurpose
  /** The `sessions` row. Absent only on a member token from before sessions existed. */
  sid?: string
  /** Seconds since the epoch. */
  iat: number
  exp: number
}

/** A verified bearer: the payload, and the token as presented. */
export interface Bearer extends TokenPayload {
  token: string
}

export const ACCESS_MINUTES = 15
/** Idle limit: a member is signed out after this long without opening the app online. */
export const MEMBER_SESSION_DAYS = 180
/** Absolute limit: an admin session is a working day. */
export const ADMIN_SESSION_HOURS = 12
/** How long the refresh token just replaced is still answered, for a retry after a lost response. */
const REUSE_GRACE_S = 120
/**
 * Member tokens issued before sessions existed (pushed update 22 and
 * earlier) are still accepted until this date, so a phone that has not
 * taken the update is not signed out by it; the new app swaps one for a
 * session the first time it is online. Delete the legacy branches after it.
 */
const LEGACY_MEMBER_UNTIL = Date.parse('2027-02-01T00:00:00Z')

const encoder = new TextEncoder()

function secret(): string {
  const value = env('AUTH_SECRET')
  if (!value || value.length < 32) throw new Error('AUTH_SECRET is missing or shorter than 32 characters')
  return value
}

let keyPromise: ReturnType<typeof crypto.subtle.importKey> | undefined
function key(): ReturnType<typeof crypto.subtle.importKey> {
  keyPromise ??= crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return keyPromise
}

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function hmac(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await key(), encoder.encode(text)))
}

/** Compare without stopping at the first difference. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

const sameText = (a: string, b: string) => sameBytes(encoder.encode(a), encoder.encode(b))

async function signAccess(sub: string, kind: CodePurpose, sid: string): Promise<{ token: string; exp: number }> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + ACCESS_MINUTES * 60
  const body = base64url(encoder.encode(JSON.stringify({ sub, kind, sid, iat, exp } satisfies TokenPayload)))
  return { token: `${body}.${base64url(await hmac(body))}`, exp }
}

/** The payload if the signature holds, the kind matches and it has not expired; otherwise null. */
async function verifyToken(token: string, kind: CodePurpose): Promise<TokenPayload | null> {
  const [body, signature, extra] = token.split('.')
  if (!body || !signature || extra !== undefined || token.length > 2048) return null
  let given: Uint8Array
  try {
    given = fromBase64url(signature)
  } catch {
    return null
  }
  if (!sameBytes(given, await hmac(body))) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as TokenPayload
    if (payload.kind !== kind || typeof payload.sub !== 'string') return null
    if (!(payload.exp > Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

interface SessionRow {
  id: string
  email: string
  kind: CodePurpose
  refresh_hash: string
  previous_hash: string | null
  rotated_at: string | null
  expires_at: string
  revoked_at: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const live = (row: SessionRow | undefined): row is SessionRow =>
  !!row && !row.revoked_at && Date.parse(row.expires_at) > Date.now()

async function getSession(sid: string): Promise<SessionRow | undefined> {
  if (!UUID.test(sid)) return undefined
  const [row] = await select<SessionRow>(db(), 'sessions', `id=eq.${sid}&limit=1`)
  return row
}

const newSecret = () => base64url(crypto.getRandomValues(new Uint8Array(32)))

const refreshHash = async (sid: string, secretPart: string) => base64url(await hmac(`refresh:${sid}:${secretPart}`))

function sessionEnd(kind: CodePurpose, from = Date.now()): string {
  const span = kind === 'admin' ? ADMIN_SESSION_HOURS * 3_600_000 : MEMBER_SESSION_DAYS * 86_400_000
  return new Date(from + span).toISOString()
}

async function tokensFor(row: SessionRow, secretPart: string): Promise<Session> {
  const { token, exp } = await signAccess(row.email, row.kind, row.id)
  return {
    email: row.email,
    token,
    refresh: `${row.id}.${secretPart}`,
    tokenExpISO: new Date(exp * 1000).toISOString(),
    sessionExpISO: new Date(row.expires_at).toISOString(),
  }
}

/** A new session for a confirmed address: called once a sign-in code checks out. */
export async function createSession(email: string, kind: CodePurpose): Promise<Session> {
  const id = crypto.randomUUID()
  const secretPart = newSecret()
  const row = await insertReturning<SessionRow>(db(), 'sessions', {
    id,
    email,
    kind,
    refresh_hash: await refreshHash(id, secretPart),
    expires_at: sessionEnd(kind),
  })
  if (!row) throw new Error('Could not record the session')
  return tokensFor(row, secretPart)
}

/**
 * Swap a refresh token for a new pair. Null means signed out: unknown,
 * expired, revoked, or a replay — and a replay revokes the session, so
 * whoever copied the token is signed out along with the phone it came
 * from.
 */
export async function refreshSession(refresh: string, kind: CodePurpose): Promise<Session | null> {
  if (refresh.length > 256) return null
  const [sid, given, extra] = refresh.split('.')
  if (!sid || !given || extra !== undefined) return null
  const row = await getSession(sid)
  if (!live(row) || row.kind !== kind) return null

  const hash = await refreshHash(sid, given)
  const current = sameText(hash, row.refresh_hash)
  const previous = row.previous_hash !== null && sameText(hash, row.previous_hash)
  const retry = previous && Date.now() - Date.parse(row.rotated_at ?? '') < REUSE_GRACE_S * 1000
  if (!current && !retry) {
    if (previous) await revokeSession(sid)
    return null
  }

  // Compare-and-set on the hash held now, so two refreshes in parallel
  // cannot both win.
  const secretPart = newSecret()
  const [updated] = await patch<SessionRow>(
    db(),
    'sessions',
    `id=eq.${sid}&refresh_hash=eq.${encodeURIComponent(row.refresh_hash)}`,
    {
      refresh_hash: await refreshHash(sid, secretPart),
      previous_hash: current ? row.refresh_hash : row.previous_hash,
      rotated_at: current ? new Date().toISOString() : row.rotated_at,
      ...(kind === 'member' ? { expires_at: sessionEnd(kind) } : {}),
    },
  )
  return updated ? tokensFor(updated, secretPart) : null
}

/** End a session on the server. Every token it issued stops working at once. */
export async function revokeSession(sid: string): Promise<void> {
  if (!UUID.test(sid)) return
  await patch(db(), 'sessions', `id=eq.${sid}&revoked_at=is.null`, { revoked_at: new Date().toISOString() })
}

/** The session a refresh token names. */
export const sessionIdOf = (refresh: string): string => refresh.split('.')[0] ?? ''

/** A member token from before sessions, verified and swapped for a session. Only until `LEGACY_MEMBER_UNTIL`. */
export async function upgradeLegacy(token: string): Promise<Session | null> {
  if (Date.now() >= LEGACY_MEMBER_UNTIL) return null
  const payload = await verifyToken(token, 'member')
  if (!payload || payload.sid) return null
  return createSession(payload.sub, 'member')
}

/**
 * The token from `Authorization: Bearer …`, verified: signature, kind,
 * expiry, and a session that is still live and belongs to the same
 * address.
 */
export async function bearer(req: Request, kind: CodePurpose): Promise<Bearer | null> {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')
  if (!match) return null
  const token = match[1]!
  const payload = await verifyToken(token, kind)
  if (!payload) return null
  if (!payload.sid) {
    return kind === 'member' && Date.now() < LEGACY_MEMBER_UNTIL ? { ...payload, token } : null
  }
  const row = await getSession(payload.sid)
  if (!live(row) || row.email !== payload.sub || row.kind !== kind) return null
  return { ...payload, token }
}

/** Ended and expired sessions, a month on: the daily run's tidy-up. */
export async function pruneSessions(): Promise<void> {
  const before = encodeURIComponent(new Date(Date.now() - 30 * 86_400_000).toISOString())
  await remove(db(), 'sessions', `or=(expires_at.lt.${before},revoked_at.lt.${before})`)
}

/** What is stored for a code: an HMAC, so the table alone opens nothing. */
export async function hashCode(email: string, purpose: CodePurpose, code: string): Promise<string> {
  return base64url(await hmac(`code:${purpose}:${email}:${code}`))
}

/** Six digits, uniformly: rejection sampling, so 000000–999999 are equally likely. */
export function newCode(): string {
  const buffer = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buffer)
    const n = buffer[0]!
    if (n < 4_294_000_000) return String(n % 1_000_000).padStart(6, '0')
  }
}

/** Lower-cased, trimmed, and shaped like an address; null otherwise. */
export function normalEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length < 3 || email.length > 254) return null
  return /^[^\s@<>()[\]\\,;:"]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)
    ? email
    : null
}
