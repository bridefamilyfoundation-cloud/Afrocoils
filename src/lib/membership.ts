import { Capacitor } from '@capacitor/core'
import type {
  BillingLinkResponse,
  CheckoutRequest,
  Membership,
  MembershipResponse,
  PlanId,
  PlanOffer,
  PlanPrice,
  RequestCodeRequest,
  VerifyCodeRequest,
} from './types'
import { MEMBERSHIP_GRACE_DAYS, PLANS, accessOpen, formatAmount, membershipOpen, parseFloor, trialOpen } from './types'
import { reportFloor } from './updates'

/**
 * Membership: every feature of AfroCoils is for paying members.
 *
 * A member is an email address. Signing in sends a six-digit code from
 * no-reply@afrocoils.app (`auth/request-code`); the code is exchanged for
 * a token and the membership (`auth/verify`). A new member can take a
 * three-day free trial (`billing/trial`, no card). Paying is a Paystack
 * subscription on one of three plans (Monthly, 6 Months, Annual),
 * started from the join screen (`billing/checkout`) on Paystack's own
 * page in the browser. The `billing` function hears from Paystack and
 * records the payment, and the status check (`auth/status`) also asks
 * Paystack about the checkout directly, so the phone finds out either
 * way.
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

/**
 * Every membership answer also carries the kill switch (`ReleaseFloor`),
 * so a phone with the update check switched off still hears it. Passed
 * on to the same place the update check reports to.
 */
function heard(response: MembershipResponse): MembershipResponse {
  const floor = parseFloor(response.floor)
  if (floor) reportFloor(floor)
  return response
}

export function requestCode(email: string): Promise<void> {
  return call<void>('auth/request-code', {
    body: { email, purpose: 'member' } satisfies RequestCodeRequest,
  })
}

export function verifyCode(email: string, code: string): Promise<MembershipResponse> {
  return call<MembershipResponse>('auth/verify', {
    body: { email, code, purpose: 'member' } satisfies VerifyCodeRequest,
  }).then(heard)
}

export function checkStatus(token: string): Promise<MembershipResponse> {
  return call<MembershipResponse>('auth/status', { token }).then(heard)
}

export async function checkoutUrl(token: string, plan: PlanId): Promise<string> {
  const body: CheckoutRequest = { plan }
  return (await call<BillingLinkResponse>('billing/checkout', { token, body })).url
}

export function startTrial(token: string): Promise<MembershipResponse> {
  return call<MembershipResponse>('billing/trial', { token }).then(heard)
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
    plan: response.plan ?? null,
    periodStartISO: response.periodStartISO ?? null,
    trialEndsISO: response.trialEndsISO ?? null,
    renews: response.renews ?? (response.status === 'active' && membershipOpen(response.paidUntilISO)),
    checkedISO: new Date().toISOString(),
  }
}

/** Whether this phone opens the app. Signed out, never paid and lapsed are all no; a live trial is yes. */
export function hasAccess(membership: Membership | undefined, now: Date = new Date()): boolean {
  return membership !== undefined && accessOpen(membership, now)
}

/** Paid time (with its grace days) is what holds the app open. */
export function onPaidTime(membership: Membership | undefined, now: Date = new Date()): boolean {
  return membership !== undefined && membershipOpen(membership.paidUntilISO, now)
}

/** Open only because of the free trial. */
export function onTrial(membership: Membership | undefined, now: Date = new Date()): boolean {
  return membership !== undefined && !onPaidTime(membership, now) && trialOpen(membership.trialEndsISO, now)
}

/** A plan that renews by itself, so there is nothing to choose: the server's `autoRenewing`, as last told. */
export function autoRenews(membership: Membership | undefined, now: Date = new Date()): boolean {
  return membership !== undefined && membership.renews && onPaidTime(membership, now)
}

/**
 * When access ends, as the member should read it: the paid period's
 * end, or the trial's. The grace days are not promised here; they are a
 * cushion for a renewal Paystack is retrying.
 */
export function accessEndsISO(membership: Membership, now: Date = new Date()): string | null {
  if (onPaidTime(membership, now)) return membership.paidUntilISO
  if (trialOpen(membership.trialEndsISO, now)) return membership.trialEndsISO
  return membership.paidUntilISO ?? membership.trialEndsISO
}

/** Whole days from `now` to `iso`, rounded up; 0 once it has passed. */
export function daysLeft(iso: string | null, now: Date = new Date()): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((Date.parse(iso) - now.getTime()) / 86_400_000))
}

export interface ExpiryNotice {
  tone: 'warn' | 'info'
  text: string
  /** Choose a plan on /join, or Paystack's page for the card. */
  action: 'choose' | 'manage'
}

/**
 * What the in-app reminder banner says, or null. Shown on the last day
 * of the trial, when a membership that will not renew has three days or
 * less left, when a
 * renewal has failed, and in the grace days after a paid period ends.
 */
export function expiryNotice(membership: Membership | undefined, now: Date = new Date()): ExpiryNotice | null {
  if (!membership || !hasAccess(membership, now)) return null

  if (onTrial(membership, now)) {
    // The whole trial is three days, so only its last day is reminded.
    const ends = membership.trialEndsISO!
    if (Date.parse(ends) - now.getTime() > 86_400_000) return null
    const when = sameDay(ends, now) ? 'today' : 'tomorrow'
    return {
      tone: 'warn',
      text: `Your free trial ends ${when}. Choose a plan to keep AfroCoils open.`,
      action: 'choose',
    }
  }

  const until = membership.paidUntilISO!
  if (Date.parse(until) <= now.getTime()) {
    const lock = longDate(new Date(Date.parse(until) + MEMBERSHIP_GRACE_DAYS * 86_400_000).toISOString())
    if (membership.status === 'attention' || membership.status === 'active') {
      return {
        tone: 'warn',
        text: `Your renewal hasn’t gone through yet. Paystack retries the card; the app stays open until ${lock}.`,
        action: 'manage',
      }
    }
    return { tone: 'warn', text: `Your membership has ended. The app stays open until ${lock}; choose a plan to carry on.`, action: 'choose' }
  }

  if (membership.status === 'attention') {
    return { tone: 'warn', text: 'Your last renewal didn’t go through. Check the card under Manage or cancel.', action: 'manage' }
  }
  if (autoRenews(membership, now) || daysLeft(until, now) > 3) return null
  return {
    tone: daysLeft(until, now) <= 1 ? 'warn' : 'info',
    text: `Your membership ends on ${longDate(until)} and won’t renew. Choose a plan to keep AfroCoils open.`,
    action: 'choose',
  }
}

/** The Membership row's one-line value on My Hair Profile: "6 Months", "Free trial · 2 days left". */
export function memberSummary(membership: Membership, now: Date = new Date()): string {
  if (!hasAccess(membership, now)) return membership.paidUntilISO || membership.trialEndsISO ? 'Ended' : 'Not paid'
  if (onTrial(membership, now)) {
    const left = daysLeft(membership.trialEndsISO, now)
    return `Free trial · ${left} day${left === 1 ? '' : 's'} left`
  }
  if (membership.status === 'attention') return 'Needs attention'
  const label = membership.plan ? PLANS[membership.plan].label : 'Member'
  if (autoRenews(membership, now)) return label
  const until = new Date(membership.paidUntilISO!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${label} · until ${until}`
}

function sameDay(iso: string, now: Date): boolean {
  return new Date(iso).toDateString() === now.toDateString()
}

/**
 * When a Paystack checkout was last opened from this phone, in memory
 * only. While it is recent, coming back to the app asks the server
 * straight away even if the app is already open (on the trial, or on a
 * plan that is ending), so a payment shows without waiting twelve hours.
 */
let checkoutOpenedAt = 0

export function markCheckoutOpened(): void {
  checkoutOpenedAt = Date.now()
}

export function checkoutRecentlyOpened(now: number = Date.now()): boolean {
  return checkoutOpenedAt > 0 && now - checkoutOpenedAt < 3_600_000
}

/** Whether it is time to ask the server again. */
export function dueForCheck(membership: Membership, now: Date = new Date()): boolean {
  const checked = Date.parse(membership.checkedISO)
  return !Number.isFinite(checked) || now.getTime() - checked > RECHECK_HOURS * 3_600_000
}

/** "₦2,500 a month", from the plan Paystack holds. */
export function formatPrice(price: PlanPrice | null | undefined): string | null {
  if (!price) return null
  const amount = formatAmount(price.amount, price.currency)
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

/**
 * How a plan compares with paying monthly, worked out from the prices
 * Paystack holds, never a number written here: six months at 7,500
 * against 1,500 a month reads "1,250 a month" and "Save 1,500". No
 * saving line when the monthly plan is not on offer or there is none.
 */
export function planValue(offer: PlanOffer, offers: PlanOffer[]): { perMonth: string | null; saving: string | null } {
  const months = PLANS[offer.id].months
  if (months === 1) return { perMonth: null, saving: null }
  const perMonth = `${formatAmount(Math.round(offer.amount / months / 100) * 100, offer.currency)} a month`
  const monthly = offers.find((o) => o.id === 'monthly' && o.currency === offer.currency)
  const full = monthly ? monthly.amount * months : 0
  const saving = full > offer.amount ? `Save ${formatAmount(full - offer.amount, offer.currency)}` : null
  return { perMonth, saving }
}
