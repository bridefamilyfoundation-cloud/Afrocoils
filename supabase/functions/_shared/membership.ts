/**
 * What a phone is told about its member, and the two ways the server
 * checks with Paystack before it answers.
 *
 * `auth/verify`, `auth/status` and `billing/trial` all answer with
 * `membershipFor()`, so the three cannot disagree about who has access.
 */
import type { MembershipResponse, PlanOffer } from '../../../src/lib/types.ts'
import { accessOpen, membershipOpen } from '../../../src/lib/types.ts'
import { getMember, laterOf, recordCharge, saveMember, trialKey, db, type MemberRow } from './members.ts'
import {
  fetchSubscription,
  memberStatus,
  planIdFor,
  planOffers,
  transactionPlanCode,
  verifyTransaction,
} from './paystack.ts'
import { releaseFloor } from './releases.ts'
import { select } from './supabase.ts'
import { signToken } from './token.ts'

const iso = (value: string | null | undefined) => (value ? new Date(value).toISOString() : null)

/** A member whose plan renews by itself: nothing to choose, nothing to buy. */
export function autoRenewing(member: MemberRow | undefined): boolean {
  return (
    !!member &&
    member.status === 'active' &&
    !!member.paystack_subscription &&
    membershipOpen(member.paid_until)
  )
}

/**
 * Verification that does not wait on the webhook.
 *
 * 1. A checkout was started and not yet seen paid: ask Paystack about
 *    that reference. A success is recorded exactly as the webhook would
 *    record it (`recordCharge`), so whichever arrives second is a no-op.
 * 2. A Paystack member looks lapsed: ask Paystack for the subscription,
 *    so a renewal whose webhook never arrived costs the member nothing.
 *
 * Errors are logged, never thrown: the answer the phone gets is then
 * the one already on file.
 */
export async function refreshMember(member: MemberRow): Promise<MemberRow> {
  let current = member

  if (current.pending_reference) {
    try {
      const tx = await verifyTransaction(current.pending_reference)
      if (tx.status === 'success') {
        const code = transactionPlanCode(tx) ?? null
        await recordCharge({
          reference: tx.reference,
          email: current.email,
          amount: tx.amount,
          currency: tx.currency,
          paidAt: tx.paid_at ?? new Date().toISOString(),
          planCode: code,
          plan: planIdFor(code),
          customerCode: tx.customer?.customer_code ?? null,
        })
        current = (await getMember(current.email)) ?? current
      } else if (tx.status === 'failed' || tx.status === 'reversed') {
        current = await saveMember(current.email, { pending_reference: null })
      }
    } catch (error) {
      console.error('[membership] checkout verification failed', error)
    }
  }

  if (current.paystack_subscription && !membershipOpen(current.paid_until)) {
    try {
      const sub = await fetchSubscription(current.paystack_subscription)
      current = await saveMember(current.email, {
        status: memberStatus(sub.status),
        plan: planIdFor(sub.plan?.plan_code) ?? current.plan,
        paid_until: laterOf(current.paid_until, sub.next_payment_date),
      })
    } catch (error) {
      console.error('[membership] subscription refresh failed', error)
    }
  }

  return current
}

/** Whether `email` can still start its free trial. */
export async function trialAvailable(email: string, member: MemberRow | undefined): Promise<boolean> {
  // Anyone who has ever had paid time, or a trial, has had their start.
  if (member?.paid_until || member?.trial_ends_at) return false
  const taken = await select<{ key: string }>(db(), 'trials', `key=eq.${encodeURIComponent(trialKey(email))}&limit=1`)
  return taken.length === 0
}

/** The answer for one address, with a fresh token. */
export async function membershipFor(email: string): Promise<MembershipResponse> {
  let member = await getMember(email)
  if (member) {
    member = await refreshMember(member)
    // Best-effort: the admin's "last seen" column, nothing more.
    void saveMember(email, { last_seen_at: new Date().toISOString() }).catch(() => undefined)
  }

  const paidUntilISO = iso(member?.paid_until)
  const trialEndsISO = iso(member?.trial_ends_at)
  const open = accessOpen({ paidUntilISO, trialEndsISO })
  const choosing = !autoRenewing(member)

  let plans: PlanOffer[] | null = null
  if (choosing) plans = await planOffers().catch(() => null)
  const monthly = plans?.find((p) => p.id === 'monthly')

  const floor = await releaseFloor()
  const { token } = await signToken(email, 'member')
  return {
    ...(floor ? { floor } : {}),
    email,
    token,
    status: member?.status ?? 'none',
    paidUntilISO,
    plan: member?.plan ?? null,
    periodStartISO: iso(member?.period_start),
    trialEndsISO,
    renews: !choosing,
    trialAvailable: open ? false : await trialAvailable(email, member),
    price: !open && monthly ? { amount: monthly.amount, currency: monthly.currency, interval: 'monthly' } : undefined,
    plans,
  }
}
