import { Capacitor } from '@capacitor/core'
import type {
  BillingLinkResponse,
  Membership,
  MembershipResponse,
  PlanPrice,
  RequestCodeRequest,
  VerifyCodeRequest,
} from './types'
import { membershipOpen } from './types'

/**
 * Membership: every feature of AfroCoils is for paying members.
 *
 * A member is an email address. Signing in sends a six-digit code from
 * no-reply@afrocoils.app (`auth/request-code`); the code is exchanged for
 * a token and the membership (`auth/verify`). Paying is a monthly
 * Paystack subscription, started from the join screen (`billing/checkout`)
 * on Paystack's own page in the browser. The `billing` function hears
 * from Paystack and records the payment; the phone finds out on its next
 * status check (`auth/status`).
 *
 * The answer is kept on the profile, so the app works with no signal for
 * as long as the membership is paid up — the rescue flow still has to
 * work in a bathroom with no reception. With signal, it asks again at
 * most every twelve hours and whenever the app comes back to the front,
 * which is how a renewal, a cancellation or a revoke reaches the phone.
 *
 * What crosses the wire is the email, the code and the token. Nothing
 * else on the profile does, and Ask questions stay anonymous: they are
 * never sent with the token.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** How often the phone re-asks while it has a membership. */
export const RECHECK_HOURS = 12

export class MembershipError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function call<T>(path: string, init: { body?: unknown; token?: string } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: JSON.stringify(init.body ?? {}),
    })
  } catch {
    throw new MembershipError('No connection. Signing in needs signal once; after that the app works offline.', 0)
  }
  if (response.status === 204) return undefined as T
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) throw new MembershipError(body?.error ?? `Request failed (${response.status})`, response.status)
  return body as T
}

export function requestCode(email: string): Promise<void> {
  return call<void>('auth/request-code', {
    body: { email, purpose: 'member' } satisfies RequestCodeRequest,
  })
}

export function verifyCode(email: string, code: string): Promise<MembershipResponse> {
  return call<MembershipResponse>('auth/verify', {
    body: { email, code, purpose: 'member' } satisfies VerifyCodeRequest,
  })
}

export function checkStatus(token: string): Promise<MembershipResponse> {
  return call<MembershipResponse>('auth/status', { token })
}

export async function checkoutUrl(token: string): Promise<string> {
  return (await call<BillingLinkResponse>('billing/checkout', { token })).url
}

export async function manageUrl(token: string): Promise<string> {
  return (await call<BillingLinkResponse>('billing/manage', { token })).url
}

/** The server's answer, as the profile keeps it. */
export function toMembership(response: MembershipResponse): Membership {
  return {
    email: response.email,
    token: response.token,
    status: response.status,
    paidUntilISO: response.paidUntilISO,
    checkedISO: new Date().toISOString(),
  }
}

/** Whether this phone opens the app. Signed out, never paid and lapsed are all no. */
export function hasAccess(membership: Membership | undefined, now: Date = new Date()): boolean {
  return membership !== undefined && membershipOpen(membership.paidUntilISO, now)
}

/** Whether it is time to ask the server again. */
export function dueForCheck(membership: Membership, now: Date = new Date()): boolean {
  const checked = Date.parse(membership.checkedISO)
  return !Number.isFinite(checked) || now.getTime() - checked > RECHECK_HOURS * 3_600_000
}

/** "₦2,500 a month", from the plan Paystack holds. */
export function formatPrice(price: PlanPrice | null | undefined): string | null {
  if (!price) return null
  const amount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: price.currency,
    maximumFractionDigits: price.amount % 100 === 0 ? 0 : 2,
  }).format(price.amount / 100)
  const per: Record<string, string> = {
    monthly: 'a month',
    annually: 'a year',
    quarterly: 'every three months',
    biannually: 'every six months',
    weekly: 'a week',
    daily: 'a day',
  }
  return `${amount} ${per[price.interval] ?? price.interval}`
}

/** "5 December 2026". */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Open a Paystack page outside the app. In the APK a top-level
 * navigation to another host is handed to the system browser by
 * Capacitor, which is where a payment page belongs; in a browser it is a
 * new tab, so the app stays open behind it.
 */
export function openExternal(url: string): void {
  if (Capacitor.isNativePlatform()) window.location.href = url
  else window.open(url, '_blank', 'noopener,noreferrer')
}
