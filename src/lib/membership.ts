import { Capacitor } from '@capacitor/core'
import type {
  BillingLinkResponse,
  CheckoutRequest,
  LogoutRequest,
  Membership,
  MembershipResponse,
  PlanId,
  PlanOffer,
  RefreshRequest,
  RequestCodeRequest,
  SessionTokens,
  TransferInfoResponse,
  TransferRequest,
  TransferSummary,
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
 * Signing in opens a session on the server: a fifteen-minute access
 * token and a refresh token, swapped for a new pair (`auth/refresh`)
 * whenever the access token is about to run out. Signing out ends the
 * session on the server too (`auth/logout`), so a copy of either token
 * stops working.
 *
 * What crosses the wire is the email, the code and the tokens. Nothing
 * else on the profile does, and Ask questions stay anonymous: they are
 * never sent with a token.
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

/* ------------------------------------------------------------------ *
 * The session
 * ------------------------------------------------------------------ */

/** What a signed-in call needs from the profile's membership. */
export type Session = Pick<Membership, 'email' | 'token' | 'refresh' | 'tokenExpISO'>

/**
 * The newest tokens this run has seen. The profile keeps them across
 * launches, but a screen can hold a copy from before the last refresh,
 * and a refresh token is good once: this is what every call uses.
 */
let live: Session | undefined
let renewing: Promise<Session> | undefined
let renewed: ((session: Session) => void) | undefined

/** Told about every new pair, so the profile can keep it. MembershipSync listens. */
export function onSessionRenewed(listener: (session: Session) => void): () => void {
  renewed = listener
  return () => {
    if (renewed === listener) renewed = undefined
  }
}

function adopt(session: Session): Session {
  const newer = !live || live.email !== session.email || (session.tokenExpISO ?? '') > (live.tokenExpISO ?? '')
  if (newer) live = session
  return live!
}

const fresh = (s: Session) => !!s.refresh && !!s.tokenExpISO && Date.parse(s.tokenExpISO) - Date.now() > 60_000

/** A new pair for this session. One at a time, so parallel calls share it rather than racing the rotation. */
function renew(session: Session): Promise<Session> {
  renewing ??= (async () => {
    const body: RefreshRequest = session.refresh
      ? { refresh: session.refresh, purpose: 'member' }
      : // A profile from before server sessions: swap the old token for one.
        { legacy: session.token, purpose: 'member' }
    const tokens = await call<SessionTokens>('auth/refresh', { body })
    live = { email: session.email, token: tokens.token, refresh: tokens.refresh, tokenExpISO: tokens.tokenExpISO }
    renewed?.(live)
    return live
  })().finally(() => {
    renewing = undefined
  })
  return renewing
}

/** A signed-in call, refreshing the access token first if it is about to run out, and once more on a 401. */
async function authed<T>(path: string, session: Session, body?: unknown): Promise<T> {
  let current = adopt(session)
  const wasFresh = fresh(current)
  if (!wasFresh) current = await renew(current)
  try {
    return await call<T>(path, { token: current.token, body })
  } catch (error) {
    if (!(wasFresh && error instanceof MembershipError && error.status === 401)) throw error
    current = await renew(current)
    return call<T>(path, { token: current.token, body })
  }
}

/**
 * Sign this phone out, on the server as well: the session is ended, so
 * neither token works again. Best effort: with no signal the phone
 * still forgets them, and the session runs out on its own.
 */
export async function signOutSession(session: Session | undefined): Promise<void> {
  const current = session ? adopt(session) : undefined
  live = undefined
  if (current?.refresh) {
    await call<void>('auth/logout', { body: { refresh: current.refresh } satisfies LogoutRequest }).catch(() => undefined)
  }
}

export function checkStatus(session: Session): Promise<MembershipResponse> {
  return authed<MembershipResponse>('auth/status', session).then(heard)
}

export async function checkoutUrl(session: Session, plan: PlanId): Promise<string> {
  const body: CheckoutRequest = { plan }
  return (await authed<BillingLinkResponse>('billing/checkout', session, body)).url
}

export function startTrial(session: Session): Promise<MembershipResponse> {
  return authed<MembershipResponse>('billing/trial', session).then(heard)
}

/** The account to pay into, the transfer prices, and this member's latest transfer. */
export function transferInfo(session: Session): Promise<TransferInfoResponse> {
  return authed<TransferInfoResponse>('billing/transfer-info', session)
}

/**
 * Send a bank transfer receipt for a person to check. The server
 * re-checks every field and the image itself; a retry with the same
 * `clientId` answers with the first one rather than sending it twice.
 */
export function sendTransfer(session: Session, body: TransferRequest): Promise<TransferSummary> {
  return authed<TransferSummary>('billing/transfer', session, body)
}

export async function manageUrl(session: Session): Promise<string> {
  return (await authed<BillingLinkResponse>('billing/manage', session)).url
}

/**
 * The server's answer, as the profile keeps it. A sign-in carries a new
 * session's tokens; other answers echo the access token, and the tokens
 * kept are the newest this run has seen.
 */
export function toMembership(response: MembershipResponse): Membership {
  const tokens: Session = response.refresh
    ? adopt({ email: response.email, token: response.token, refresh: response.refresh, tokenExpISO: response.tokenExpISO })
    : live?.email === response.email
      ? live
      : { email: response.email, token: response.token }
  return {
    email: response.email,
    token: tokens.token,
    ...(tokens.refresh ? { refresh: tokens.refresh, tokenExpISO: tokens.tokenExpISO } : {}),
    status: response.status,
    paidUntilISO: response.paidUntilISO,
    plan: response.plan ?? null,
    periodStartISO: response.periodStartISO ?? null,
    trialEndsISO: response.trialEndsISO ?? null,
    renews: response.renews ?? (response.status === 'active' && membershipOpen(response.paidUntilISO)),
    ...(typeof response.card === 'boolean' ? { card: response.card } : {}),
    checkedISO: new Date().toISOString(),
  }
}

/**
 * The moment access is judged at: the phone's clock, but never earlier
 * than the server's last answer. A clock set back (by hand, or a flat
 * battery) would otherwise hold a lapsed membership open for as long as
 * it stayed wrong. A clock that is right is never before `checkedISO`,
 * so this costs a real member nothing.
 */
function judgedAt(membership: Membership, now: Date): Date {
  const checked = Date.parse(membership.checkedISO)
  return Number.isFinite(checked) && checked > now.getTime() ? new Date(checked) : now
}

/** Whether this phone opens the app. Signed out, never paid and lapsed are all no; a live trial is yes. */
export function hasAccess(membership: Membership | undefined, now: Date = new Date()): boolean {
  return membership !== undefined && accessOpen(membership, judgedAt(membership, now))
}

/** Whether there is a card subscription for "Manage or cancel" to open. Older answers did not say: any plan counts. */
export function hasCard(membership: Membership | undefined): boolean {
  return membership !== undefined && (membership.card ?? membership.plan !== null)
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
    // Only a card subscription has a renewal to retry. A plan paid by
    // bank transfer is `active` too, and has simply ended.
    if (hasCard(membership) && (membership.renews || membership.status === 'attention')) {
      return {
        tone: 'warn',
        text: `Your renewal hasn’t gone through yet. Paystack retries the card; the app stays open until ${lock}.`,
        action: 'manage',
      }
    }
    return { tone: 'warn', text: `Your membership has ended. The app stays open until ${lock}; choose a plan to carry on.`, action: 'choose' }
  }

  if (membership.status === 'attention' && hasCard(membership)) {
    return { tone: 'warn', text: 'Your last renewal didn’t go through. Check the card under Manage or cancel.', action: 'manage' }
  }
  if (autoRenews(membership, now) || daysLeft(until, now) > 3) return null
  return {
    tone: daysLeft(until, now) <= 1 ? 'warn' : 'info',
    text: `Your membership ends on ${longDate(until)} and won’t renew. Renew by bank transfer now, or by card from that day, to keep AfroCoils open.`,
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
  if (!Number.isFinite(checked)) return true
  // A clock behind the last answer is a clock that was moved: ask again.
  const since = now.getTime() - checked
  return since < 0 || since > RECHECK_HOURS * 3_600_000
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
