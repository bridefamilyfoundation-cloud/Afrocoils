/**
 * Signed tokens and hashed sign-in codes.
 *
 * A token is `base64url(payload).base64url(HMAC-SHA256(payload))`, keyed
 * on AUTH_SECRET, a random value set with `supabase secrets set` and
 * nowhere else. It says one thing: this address was confirmed with a
 * code, and when. It carries no payment state — whether the address is
 * paid up is read from `members` on every status check, so revoking a
 * member takes effect on their next check rather than when a token runs
 * out.
 *
 * Not a JWT library: two HMACs and a JSON parse are less code than the
 * dependency, and there is one algorithm, so there is no `alg` header to
 * confuse.
 */
import { env } from './env.ts'
import type { CodePurpose } from '../../../src/lib/types.ts'

export interface TokenPayload {
  /** The confirmed email, lower-cased. */
  sub: string
  kind: CodePurpose
  /** Seconds since the epoch. */
  iat: number
  exp: number
}

/** A member signs in once per phone; the token is refreshed on every status check. */
export const MEMBER_TOKEN_DAYS = 180
/** An admin session is a working day. */
export const ADMIN_TOKEN_HOURS = 12

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

export async function signToken(sub: string, kind: CodePurpose): Promise<{ token: string; exp: number }> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + (kind === 'admin' ? ADMIN_TOKEN_HOURS * 3600 : MEMBER_TOKEN_DAYS * 86400)
  const body = base64url(encoder.encode(JSON.stringify({ sub, kind, iat, exp } satisfies TokenPayload)))
  return { token: `${body}.${base64url(await hmac(body))}`, exp }
}

/** The payload if the signature holds, the kind matches and it has not expired; otherwise null. */
export async function verifyToken(token: string, kind: CodePurpose): Promise<TokenPayload | null> {
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

/** The token from `Authorization: Bearer …`, verified. */
export function bearer(req: Request, kind: CodePurpose): Promise<TokenPayload | null> {
  const header = req.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(\S+)$/i.exec(header)
  return match ? verifyToken(match[1]!, kind) : Promise.resolve(null)
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
