/**
 * What a phone is told about its member, and the two ways the server
 * checks with Paystack before it answers.
 *
 * `auth/verify`, `auth/status` and `billing/trial` all answer with
 * `membershipFor()`, so the three cannot disagree about who has access.
 */
import type { MembershipResponse, PlanOffer } from '../../../src/lib/types.ts'
import { MEMBERSHIP_GRACE_DAYS, accessOpen, membershipOpen } from '../../../src/lib/types.ts'
import { getMember, laterOf, recordCharge, saveMember, trialKey, db, type MemberRow } from './members.ts'
import {
  disableSubscription,
  fetchSubscription,
  memberStatus,
  planIdFor,
  planOffers,
  transactionPlanCode,
  verifyTransaction,
} from './paystack.ts'
import { releaseFloor } from './releases.ts'
import { patch, select } from './supabase.ts'
import { signToken } from './token.ts'

const DAY = 86_400_000

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
      // `next_payment_date` is when Paystack will next *try* the card,
      // not proof of a payment. Only an active subscription has paid
      // for the period up to it; `attention` (a failed renewal), a
      // cancelled or a non-renewing one has not, and believing its date
      // would reopen a lapsed or revoked member.
      const paid = sub.status === 'active'
      current = await saveMember(current.email, {
        status: memberStatus(sub.status),
        plan: planIdFor(sub.plan?.plan_code) ?? current.plan,
        ...(paid ? { paid_until: laterOf(current.paid_until, sub.next_payment_date) } : {}),
      })
    } catch (error) {
      console.error('[membership] subscription refresh failed', error)
    }
  }

  return current
}

/**
 * Shut a member out now: revoked on the admin site, or the payment that
 * opened the current period was refunded or charged back.
 *
 * - The Paystack subscription is disabled, so the card is not charged
 *   again for access they no longer have. Its code is then dropped from
 *   the row either way, so `refreshMember` has nothing to ask about
 *   and cannot reopen the member from it; if disabling failed, the note
 *   says so and names it, for cancelling in the Paystack dashboard.
 * - Paid time and any running trial end past the grace period, so the
 *   next status check locks the app. The trial stays *used*: its row in
 *   `trials` and `trial_ends_at` both remain.
 * - The "ended" reminder is marked as sent: this is not a lapse, and
 *   "choose a plan to carry on" is the wrong thing to email.
 *
 * A charge that arrives later (a real payment) still opens it again
 * through `recordCharge`, as it should.
 */
export async function closeAccess(member: MemberRow, reason: string): Promise<MemberRow> {
  const notes = [reason]
  const code = member.paystack_subscription
  if (code) {
    try {
      const token = member.paystack_email_token ?? (await fetchSubscription(code)).email_token
      await disableSubscription(code, token)
    } catch (error) {
      console.error('[membership] could not disable the Paystack subscription', error)
      notes.push(`could not stop Paystack subscription ${code}: cancel it in the Paystack dashboard`)
    }
  }

  const now = Date.now()
  const past = new Date(now - (MEMBERSHIP_GRACE_DAYS + 1) * DAY).toISOString()
  const paidUntil = member.paid_until && Date.parse(member.paid_until) < Date.parse(past) ? member.paid_until : past
  const trialEnds =
    member.trial_ends_at && Date.parse(member.trial_ends_at) > Date.parse(past) ? past : member.trial_ends_at
  // The same moment `noticeFor` in billing would call "closed".
  const closed = Math.max(Date.parse(paidUntil) + MEMBERSHIP_GRACE_DAYS * DAY, trialEnds ? Date.parse(trialEnds) : 0)

  return saveMember(member.email, {
    status: 'cancelled',
    paid_until: paidUntil,
    trial_ends_at: trialEnds,
    paystack_subscription: null,
    paystack_email_token: null,
    pending_reference: null,
    last_notice: `ended:${new Date(closed).toISOString().slice(0, 10)}`,
    note: appendNote(member.note, notes.join('; ')),
  })
}

/** A dated line on the member's admin note, keeping the newest 500 characters. */
export function appendNote(existing: string | null | undefined, line: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return [existing, `${date} ${line}`].filter(Boolean).join('\n').slice(-500)
}

/**
 * A refund or a lost chargeback, from the webhook. The payment row is
 * marked whatever happens, so the admin's list shows it and a replayed
 * `charge.success` cannot reopen the period it paid for.
 *
 * Access ends only when the whole charge came back *and* it is the
 * member's latest payment — the one their current period stands on. A
 * partial refund, or a refund of an older period, changes nothing about
 * access and leaves a note for a person to decide.
 */
export async function reverseCharge(input: {
  reference: string
  kind: 'refund' | 'chargeback'
  amount: number | undefined
}): Promise<void> {
  const [payment] = await select<PaymentRow>(db(), 'payments', `reference=eq.${encodeURIComponent(input.reference)}&limit=1`)
  if (!payment) {
    console.warn(`[membership] ${input.kind} for a payment we have no record of`)
    return
  }
  if (payment.reversed_at) return

  const amount = input.amount ?? payment.amount
  const [latest] = await select<PaymentRow>(
    db(),
    'payments',
    `email=eq.${encodeURIComponent(payment.email)}&reversed_at=is.null&order=paid_at.desc&limit=1`,
  )
  await patch(db(), 'payments', `reference=eq.${encodeURIComponent(payment.reference)}`, {
    reversed_at: new Date().toISOString(),
    reversal: input.kind,
    reversed_amount: amount,
  })

  const member = await getMember(payment.email)
  if (!member) return
  const what = `${input.kind} of ${payment.reference}`
  if (amount < payment.amount) {
    await saveMember(member.email, { note: appendNote(member.note, `partial ${what}: access unchanged`) })
  } else if (latest?.reference !== payment.reference) {
    await saveMember(member.email, { note: appendNote(member.note, `${what} (an older period): access unchanged`) })
  } else {
    await closeAccess(member, `${what}: access ended`)
  }
}

interface PaymentRow {
  reference: string
  email: string
  amount: number
  paid_at: string
  reversed_at: string | null
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
