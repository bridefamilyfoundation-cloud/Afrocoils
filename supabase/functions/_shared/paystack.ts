/**
 * Paystack: the monthly plan, checkout, the subscription, the webhook.
 *
 * PAYSTACK_SECRET_KEY and PAYSTACK_PLAN_CODE live in the function
 * environment. The price is the plan's, read from Paystack rather than
 * written here, so changing it in the Paystack dashboard changes it
 * everywhere without a release.
 *
 * Card details never come near this project: checkout happens on
 * Paystack's own page, and what arrives here is the customer's email,
 * the amount and Paystack's references.
 */
import { env } from './env.ts'
import type { MemberStatus, PlanPrice } from '../../../src/lib/types.ts'

const API = 'https://api.paystack.co'

function secretKey(): string {
  const key = env('PAYSTACK_SECRET_KEY')
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is missing from the function environment')
  return key
}

export function planCode(): string {
  const code = env('PAYSTACK_PLAN_CODE')
  if (!code) throw new Error('PAYSTACK_PLAN_CODE is missing from the function environment')
  return code
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
 * The plan
 * ------------------------------------------------------------------ */

let cachedPrice: { price: PlanPrice; at: number } | undefined

/** The plan's price, cached for ten minutes per function instance. Null if Paystack cannot be reached. */
export async function planPrice(): Promise<PlanPrice | null> {
  if (cachedPrice && Date.now() - cachedPrice.at < 600_000) return cachedPrice.price
  try {
    const plan = await call<{ amount: number; currency: string; interval: string }>(
      `/plan/${encodeURIComponent(planCode())}`,
    )
    const price = { amount: plan.amount, currency: plan.currency, interval: plan.interval }
    cachedPrice = { price, at: Date.now() }
    return price
  } catch (error) {
    console.error('[paystack] plan lookup failed', error)
    return null
  }
}

/* ------------------------------------------------------------------ *
 * Checkout
 * ------------------------------------------------------------------ */

/**
 * A Paystack checkout page that subscribes `email` to the plan. The
 * amount is required by the API and overridden by the plan's own.
 */
export async function startCheckout(email: string): Promise<string> {
  const price = await planPrice()
  const data = await call<{ authorization_url: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: price?.amount ?? 100,
      plan: planCode(),
      callback_url: env('PAYSTACK_CALLBACK_URL') || 'https://afrocoils.app/joined.html',
      channels: ['card'],
      metadata: { source: 'afrocoils-app' },
    }),
  })
  return data.authorization_url
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
