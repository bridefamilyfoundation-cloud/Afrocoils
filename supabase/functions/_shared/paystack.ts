/**
 * Paystack: the three plans, checkout, verification, the subscription,
 * the webhook.
 *
 * PAYSTACK_SECRET_KEY lives in the function environment, and so does
 * one plan code per plan: PAYSTACK_PLAN_MONTHLY (PAYSTACK_PLAN_CODE, the
 * single plan before 2026-11-11, still counts as it), PAYSTACK_PLAN_BIANNUAL
 * and PAYSTACK_PLAN_ANNUAL. The prices are the plans', read from
 * Paystack rather than written here, so changing one in the Paystack
 * dashboard changes it everywhere without a release.
 *
 * Card details never come near this project: checkout happens on
 * Paystack's own page, and what arrives here is the customer's email,
 * the amount and Paystack's references.
 */
import { env } from './env.ts'
import type { MemberStatus, PlanId, PlanOffer, PlanPrice, Promo } from '../../../src/lib/types.ts'
import { PLAN_IDS, promoPrice } from '../../../src/lib/types.ts'

const API = 'https://api.paystack.co'

function secretKey(): string {
  const key = env('PAYSTACK_SECRET_KEY')
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is missing from the function environment')
  return key
}

/**
 * Whether a promotion may discount card checkout on this server.
 *
 * A promotional card payment is a one-off charge followed by a
 * subscription the server starts itself (`startRenewal`), a flow that
 * has to be tried end to end in Paystack test mode before it touches a
 * real card. So it is on by itself under a test key (`sk_test_`), and
 * under a live key only once PAYSTACK_CARD_PROMO is set to `on` — the
 * step that says the test-mode run was done.
 */
export function cardPromoAllowed(): boolean {
  const key = env('PAYSTACK_SECRET_KEY') ?? ''
  if (!key) return false
  return key.startsWith('sk_test_') || env('PAYSTACK_CARD_PROMO')?.trim() === 'on'
}

/** Whether `promo` takes money off card checkout for `plan`. */
export function cardPromoFor(promo: Promo | null | undefined, plan: PlanId): promo is Promo {
  return !!promo?.card && promo.plans.includes(plan) && cardPromoAllowed()
}

const PLAN_ENV: Record<PlanId, string[]> = {
  monthly: ['PAYSTACK_PLAN_MONTHLY', 'PAYSTACK_PLAN_CODE'],
  biannual: ['PAYSTACK_PLAN_BIANNUAL'],
  annual: ['PAYSTACK_PLAN_ANNUAL'],
}

/** The Paystack plan code for one of ours, or undefined when that plan is not set up. */
export function planCodeFor(plan: PlanId): string | undefined {
  for (const name of PLAN_ENV[plan]) {
    const code = env(name)?.trim()
    if (code) return code
  }
  return undefined
}

/** Ours, for a Paystack plan code. Undefined: not one of our plans. */
export function planIdFor(code: string | null | undefined): PlanId | undefined {
  if (!code) return undefined
  return PLAN_IDS.find((id) => planCodeFor(id) === code)
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const body = (await response.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null
  if (!response.ok || !body?.status) {
    throw new Error(`Paystack ${path} failed (${response.status}): ${body?.message ?? 'no message'}`)
  }
  return body.data as T
}

/* ------------------------------------------------------------------ *
 * The plans
 * ------------------------------------------------------------------ */

const cachedPrices = new Map<PlanId, { price: PlanPrice; at: number }>()

/** One plan's price, cached for ten minutes per function instance. Null if unset or unreachable. */
export async function planPrice(plan: PlanId = 'monthly'): Promise<PlanPrice | null> {
  const cached = cachedPrices.get(plan)
  if (cached && Date.now() - cached.at < 600_000) return cached.price
  const code = planCodeFor(plan)
  if (!code) return null
  try {
    const data = await call<{ amount: number; currency: string; interval: string }>(
      `/plan/${encodeURIComponent(code)}`,
    )
    const price = { amount: data.amount, currency: data.currency, interval: data.interval }
    cachedPrices.set(plan, { price, at: Date.now() })
    return price
  } catch (error) {
    console.error(`[paystack] ${plan} plan lookup failed`, error)
    return null
  }
}

/**
 * Every plan that is set up and reachable, in PLAN_IDS order. Under a
 * promotion on card, `firstAmount` is the first payment; `amount` stays
 * what it renews at.
 */
export async function planOffers(promo: Promo | null = null): Promise<PlanOffer[]> {
  const prices = await Promise.all(PLAN_IDS.map((id) => planPrice(id)))
  return PLAN_IDS.flatMap((id, i) => {
    const price = prices[i]
    if (!price) return []
    const offer: PlanOffer = { id, amount: price.amount, currency: price.currency }
    if (cardPromoFor(promo, id)) {
      const first = promoPrice(price.amount, promo.percentOff)
      if (first < price.amount) return [{ ...offer, firstAmount: first }]
    }
    return [offer]
  })
}

/* ------------------------------------------------------------------ *
 * Checkout and verification
 * ------------------------------------------------------------------ */

/** The page that says "go back to the app", for a browser that cannot open it. */
export function returnFallback(): string {
  return env('PAYSTACK_CALLBACK_URL') || 'https://afrocoils.app/joined.html'
}

/**
 * Where Paystack sends the browser after a payment: the billing
 * function's `return` route, which redirects into the app. Falls back
 * to the static page when the function's own address is unknown.
 */
function returnUrl(): string {
  const base = env('SUPABASE_URL')
  return base ? `${base.replace(/\/$/, '')}/functions/v1/billing/return` : returnFallback()
}

export interface Checkout {
  url: string
  reference: string
  /** Set when a promotion priced this checkout: a one-off first payment, no plan on it. */
  promo?: { amount: number; currency: string; label: string }
}

/**
 * A Paystack checkout page for `plan`.
 *
 * Normally it subscribes `email` to the plan: the amount is required by
 * the API and overridden by the plan's own. Under a promotion on card it
 * is a one-off payment of the discounted price with *no* plan on it; the
 * subscription is started once that payment is believed (`startRenewal`),
 * on the same card, first charging the full price when the paid period
 * ends. The caller records that checkout (`card_checkouts`), which is
 * what lets the planless payment open a plan at all.
 *
 * The reference comes back either way, so the payment can be verified
 * without waiting on the webhook.
 */
export async function startCheckout(email: string, plan: PlanId, promo: Promo | null = null): Promise<Checkout> {
  const code = planCodeFor(plan)
  if (!code) throw new Error(`No Paystack plan is set up for ${plan}`)
  const price = await planPrice(plan)
  const discounted = price && cardPromoFor(promo, plan) ? promoPrice(price.amount, promo.percentOff) : null
  const promotional = price && discounted !== null && discounted < price.amount && promo
  const data = await call<{ authorization_url: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(
      promotional
        ? {
            email,
            amount: discounted,
            currency: price.currency,
            callback_url: returnUrl(),
            channels: ['card'],
            metadata: { source: 'afrocoils-app', plan, promo: `${promo.name}, ${promo.percentOff}% off` },
          }
        : {
            email,
            amount: price?.amount ?? 100,
            plan: code,
            callback_url: returnUrl(),
            channels: ['card'],
            metadata: { source: 'afrocoils-app', plan },
          },
    ),
  })
  return {
    url: data.authorization_url,
    reference: data.reference,
    ...(promotional
      ? { promo: { amount: discounted, currency: price.currency, label: `${promo.name}, ${promo.percentOff}% off` } }
      : {}),
  }
}

export interface PaystackTransaction {
  reference: string
  status: string
  amount: number
  currency: string
  paid_at: string | null
  customer: { email: string; customer_code: string }
  plan?: string | { plan_code?: string } | null
  plan_object?: { plan_code?: string } | null
  /** The card, and whether it can be charged again without the member (a subscription needs it to). */
  authorization?: CardAuthorization | null
}

export interface CardAuthorization {
  authorization_code?: string
  reusable?: boolean
  channel?: string
}

/** Paystack's own word on one transaction: `status` is `success` once it is paid. */
export function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`)
}

/** The plan code on a transaction, whichever of its shapes Paystack sent. */
export function transactionPlanCode(tx: PaystackTransaction): string | undefined {
  if (tx.plan_object?.plan_code) return tx.plan_object.plan_code
  if (typeof tx.plan === 'string') return tx.plan || undefined
  return tx.plan?.plan_code
}

/* ------------------------------------------------------------------ *
 * Subscriptions
 * ------------------------------------------------------------------ */

export interface PaystackSubscription {
  subscription_code: string
  email_token: string
  status: string
  next_payment_date: string | null
  customer: { email: string; customer_code: string }
  plan: { plan_code: string }
}

/**
 * Subscribe a customer to a plan on a card they have already paid with,
 * its first charge at `startDate` (ISO). Paystack sends
 * `subscription.create` for it, which the webhook files as usual.
 */
export function createSubscription(
  customer: string,
  plan: PlanId,
  authorization: string,
  startDate: string,
): Promise<{ subscription_code: string; email_token: string; status: string; next_payment_date?: string | null }> {
  const code = planCodeFor(plan)
  if (!code) throw new Error(`No Paystack plan is set up for ${plan}`)
  return call('/subscription', {
    method: 'POST',
    body: JSON.stringify({ customer, plan: code, authorization, start_date: startDate }),
  })
}

export function fetchSubscription(code: string): Promise<PaystackSubscription> {
  return call<PaystackSubscription>(`/subscription/${encodeURIComponent(code)}`)
}

/** A Paystack page where the member can update their card or cancel. */
export async function manageLink(code: string): Promise<string> {
  const data = await call<{ link: string }>(`/subscription/${encodeURIComponent(code)}/manage/link`)
  return data.link
}

/** Stop renewing. Access lasts to the end of the paid period. */
export async function disableSubscription(code: string, token: string): Promise<void> {
  await call('/subscription/disable', { method: 'POST', body: JSON.stringify({ code, token }) })
}

/** Paystack's words to ours. `complete` (a fixed-length plan ending) reads as cancelled. */
export function memberStatus(paystackStatus: string): MemberStatus {
  switch (paystackStatus) {
    case 'active':
      return 'active'
    case 'non-renewing':
      return 'non-renewing'
    case 'attention':
      return 'attention'
    default:
      return 'cancelled'
  }
}

/* ------------------------------------------------------------------ *
 * The webhook
 * ------------------------------------------------------------------ */

/** `x-paystack-signature` is the hex HMAC-SHA512 of the raw body, keyed on the secret key. */
export async function verifyPaystackSignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey()),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))
  const expected = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}
