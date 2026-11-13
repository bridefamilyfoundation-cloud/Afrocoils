/**
 * The `members` table, as auth, billing and admin all read it.
 */
import type { MemberStatus, PlanId } from '../../../src/lib/types.ts'
import { PLANS } from '../../../src/lib/types.ts'
import { patch, select, supabaseConfig, upsert, type SupabaseConfig } from './supabase.ts'

export interface MemberRow {
  email: string
  status: MemberStatus
  paid_until: string | null
  source: 'paystack' | 'manual'
  paystack_customer: string | null
  paystack_subscription: string | null
  paystack_email_token: string | null
  plan: PlanId | null
  period_start: string | null
  trial_ends_at: string | null
  pending_reference: string | null
  last_notice: string | null
  note: string | null
  created_at: string
  updated_at: string
  last_seen_at: string | null
}

export function db(): SupabaseConfig {
  const config = supabaseConfig()
  if (!config) throw new Error('SUPABASE_URL or the service key is missing from the function environment.')
  return config
}

export async function getMember(email: string): Promise<MemberRow | undefined> {
  const rows = await select<MemberRow>(db(), 'members', `email=eq.${encodeURIComponent(email)}&limit=1`)
  return rows[0]
}

/**
 * Create the row if it is missing, then apply `values`. Two calls rather
 * than one merge-upsert so a partial update never overwrites columns it
 * did not name with their defaults.
 */
export async function saveMember(email: string, values: Partial<Omit<MemberRow, 'email'>>): Promise<MemberRow> {
  await upsert(db(), 'members', [{ email }], { ignore: true })
  const rows = await patch<MemberRow>(db(), 'members', `email=eq.${encodeURIComponent(email)}`, {
    ...values,
    updated_at: new Date().toISOString(),
  })
  return rows[0]!
}

/** A later date wins: a webhook arriving out of order never shortens a paid period. */
export function laterOf(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return Date.parse(a) >= Date.parse(b) ? a : b
}

/** `months` calendar months on from `iso`. */
export function monthsAfter(iso: string, months: number): string {
  const date = new Date(iso)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString()
}

export interface Charge {
  reference: string
  email: string
  amount: number
  currency: string
  paidAt: string
  /** Paystack's plan code, as the charge carried it. */
  planCode: string | null
  /** Ours, when the plan code is one of our three. */
  plan: PlanId | undefined
  customerCode: string | null
}

/**
 * A successful charge, from the webhook or from verifying a checkout
 * reference — whichever arrives first. The payment row is keyed on the
 * reference, so the second arrival writes nothing new; the member's paid
 * period is the later of what it was and the charge date plus the
 * plan's length, so it never shortens and never doubles.
 *
 * Paying during the free trial starts the plan that day: the dates the
 * member is shown are the dates Paystack charges the card.
 */
export async function recordCharge(charge: Charge): Promise<void> {
  await upsert(
    db(),
    'payments',
    [
      {
        reference: charge.reference,
        email: charge.email,
        amount: charge.amount,
        currency: charge.currency,
        paid_at: charge.paidAt,
        plan: charge.planCode,
      },
    ],
    { ignore: true },
  )
  if (!charge.plan) return
  // Refunded or charged back since (`reverseCharge`): a replayed
  // `charge.success` must not reopen the period it paid for.
  const [stored] = await select<{ reversed_at: string | null }>(
    db(),
    'payments',
    `reference=eq.${encodeURIComponent(charge.reference)}&select=reversed_at&limit=1`,
  )
  if (stored?.reversed_at) return
  const member = await getMember(charge.email)
  const until = monthsAfter(charge.paidAt, PLANS[charge.plan].months)
  const later = laterOf(member?.paid_until, until)
  await saveMember(charge.email, {
    status: 'active',
    source: 'paystack',
    plan: charge.plan,
    // A replayed older charge must not move the period's start backwards.
    period_start: later === until ? charge.paidAt : (member?.period_start ?? charge.paidAt),
    paystack_customer: charge.customerCode ?? member?.paystack_customer ?? null,
    paid_until: later,
    pending_reference: member?.pending_reference === charge.reference ? null : (member?.pending_reference ?? null),
  })
}

/**
 * One trial per person: the address with its `+tag` dropped, and for
 * Gmail its dots too, which Gmail ignores. Not proof of identity, just
 * enough that the trial is not a fresh three days per alias.
 */
export function trialKey(email: string): string {
  const [local = '', domain = ''] = email.toLowerCase().trim().split('@')
  let name = local.split('+')[0]!
  const gmail = domain === 'gmail.com' || domain === 'googlemail.com'
  if (gmail) name = name.replace(/\./g, '')
  return `${name}@${gmail ? 'gmail.com' : domain}`
}
