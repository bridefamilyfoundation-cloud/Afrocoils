import type { BillingLinkResponse, MembershipResponse, PlanId } from '../../../src/lib/types.ts'
import {
  MEMBERSHIP_GRACE_DAYS,
  PLANS,
  TRIAL_DAYS,
  formatAmount,
  isPlanId,
  membershipOpen,
  trialOpen,
} from '../../../src/lib/types.ts'
import { BodyTooLarge, readJson, readText } from '../_shared/body.ts'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { noticeMail, sendMail, type NoticeKind } from '../_shared/email.ts'
import { env, serve } from '../_shared/env.ts'
import { checkLimits, limitResponse } from '../_shared/limits.ts'
import { autoRenewing, membershipFor, refreshMember, trialAvailable } from '../_shared/membership.ts'
import { db, getMember, laterOf, recordCharge, saveMember, trialKey, type MemberRow } from '../_shared/members.ts'
import {
  manageLink,
  memberStatus,
  planCodeFor,
  planIdFor,
  planPrice,
  startCheckout,
  verifyPaystackSignature,
} from '../_shared/paystack.ts'
import { select, upsert } from '../_shared/supabase.ts'
import { bearer } from '../_shared/token.ts'

/**
 * Paying for membership, through Paystack.
 *
 * - `POST billing/checkout` `{ plan }` (member token) answers a Paystack
 *   checkout URL for Monthly, 6 Months or Annual. The phone opens it in
 *   the browser; card details go to Paystack and never touch the app or
 *   this project. The reference is kept so `auth/status` can verify the
 *   payment with Paystack without waiting for the webhook.
 * - `POST billing/trial` (member token) starts the three-day free trial:
 *   once per person, no card, answered with the membership.
 * - `POST billing/manage` (member token) answers Paystack's own page for
 *   changing the card or cancelling.
 * - `POST billing/webhook` is Paystack telling us what happened, believed
 *   only when `x-paystack-signature` matches. Always 200 once verified,
 *   so Paystack does not retry an event we have already handled.
 * - `POST billing/reminders` is the daily run (pg_cron, migration 0006),
 *   believed only with `x-cron-secret`: the trial-ending, ending,
 *   renewing and ended emails, each sent once.
 *
 * Set the webhook URL in the Paystack dashboard (Settings → API Keys &
 * Webhooks) to `https://<ref>.supabase.co/functions/v1/billing/webhook`.
 */

const DAY = 86_400_000

async function body(req: Request): Promise<Record<string, unknown>> {
  // Too large, empty or not JSON all read as no choice: phones from
  // before the three plans send `{}`, which is monthly.
  const raw = await readJson(req, 4 * 1024).catch(() => ({}))
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
}

async function checkout(req: Request, origin?: string): Promise<Response> {
  const session = await bearer(req, 'member')
  if (!session) return jsonResponse({ error: 'Sign in with your email first.' }, 401, origin)

  const { plan: asked } = await body(req)
  if (asked !== undefined && !isPlanId(asked)) {
    return jsonResponse({ error: 'Choose Monthly, 6 Months or Annual.' }, 400, origin)
  }
  const plan: PlanId = asked ?? 'monthly'
  if (!planCodeFor(plan)) {
    return jsonResponse({ error: `The ${PLANS[plan].label} plan isn’t available yet. Choose another.` }, 400, origin)
  }

  const member = await getMember(session.sub)
  if (autoRenewing(member)) {
    return jsonResponse(
      {
        error:
          'You already have a plan that renews by itself. To switch plans, cancel it first under Manage or cancel, then choose the new one.',
      },
      409,
      origin,
    )
  }
  const { url, reference } = await startCheckout(session.sub, plan)
  await saveMember(session.sub, { pending_reference: reference })
  return jsonResponse({ url } satisfies BillingLinkResponse, 200, origin)
}

async function trial(req: Request, origin?: string): Promise<Response> {
  const session = await bearer(req, 'member')
  if (!session) return jsonResponse({ error: 'Sign in with your email first.' }, 401, origin)
  const email = session.sub

  const member = await getMember(email)
  const used = { error: 'This email has already had its free trial. Choose a plan to carry on.' }
  if (!(await trialAvailable(email, member))) return jsonResponse(used, 409, origin)

  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + TRIAL_DAYS * DAY).toISOString()
  const key = trialKey(email)
  // The primary key decides a race between two aliases of one address.
  await upsert(db(), 'trials', [{ key, email, started_at: startedAt.toISOString(), ends_at: endsAt }], { ignore: true })
  const [row] = await select<{ email: string; ends_at: string }>(db(), 'trials', `key=eq.${encodeURIComponent(key)}&limit=1`)
  // Ours only if the row that won carries this address and this end.
  if (!row || row.email !== email || Date.parse(row.ends_at) !== Date.parse(endsAt)) {
    return jsonResponse(used, 409, origin)
  }

  await saveMember(email, { trial_ends_at: endsAt })
  return jsonResponse((await membershipFor(email)) satisfies MembershipResponse, 200, origin)
}

async function manage(req: Request, origin?: string): Promise<Response> {
  const session = await bearer(req, 'member')
  if (!session) return jsonResponse({ error: 'Sign in with your email first.' }, 401, origin)

  const member = await getMember(session.sub)
  if (!member?.paystack_subscription) {
    return jsonResponse(
      { error: 'There is no card subscription on this email. Write to support@afrocoils.app.' },
      404,
      origin,
    )
  }
  const url = await manageLink(member.paystack_subscription)
  return jsonResponse({ url } satisfies BillingLinkResponse, 200, origin)
}

/* ------------------------------------------------------------------ */

interface PaystackEvent {
  event: string
  data: Record<string, unknown> & {
    reference?: string
    amount?: number
    currency?: string
    paid_at?: string
    paidAt?: string
    status?: string
    paid?: boolean
    subscription_code?: string
    email_token?: string
    next_payment_date?: string | null
    customer?: { email?: string; customer_code?: string }
    plan?: { plan_code?: string } | null
    subscription?: { subscription_code?: string; status?: string; next_payment_date?: string | null } | null
  }
}

async function webhook(req: Request): Promise<Response> {
  let raw: string
  try {
    raw = await readText(req, 256 * 1024)
  } catch (error) {
    if (error instanceof BodyTooLarge) return new Response(null, { status: 413 })
    throw error
  }
  if (!(await verifyPaystackSignature(raw, req.headers.get('x-paystack-signature')))) {
    console.warn('[billing] webhook with a bad signature, ignored')
    return new Response(null, { status: 401 })
  }

  const { event, data } = JSON.parse(raw) as PaystackEvent
  const email = data.customer?.email?.trim().toLowerCase()
  const planOf = data.plan?.plan_code
  const plan = planIdFor(planOf)
  console.log(`[billing] ${event}`)

  if (!email) return new Response(null, { status: 200 })

  switch (event) {
    case 'charge.success': {
      if (!data.reference) break
      await recordCharge({
        reference: data.reference,
        email,
        amount: data.amount ?? 0,
        currency: data.currency ?? 'NGN',
        paidAt: data.paid_at ?? data.paidAt ?? new Date().toISOString(),
        planCode: planOf ?? null,
        plan,
        customerCode: data.customer?.customer_code ?? null,
      })
      break
    }

    case 'subscription.create':
    case 'subscription.enable': {
      if (planOf && !plan) break
      const member = await getMember(email)
      await saveMember(email, {
        status: memberStatus(data.status ?? 'active'),
        source: 'paystack',
        plan: plan ?? member?.plan ?? null,
        paystack_customer: data.customer?.customer_code ?? null,
        paystack_subscription: data.subscription_code ?? null,
        paystack_email_token: data.email_token ?? null,
        paid_until: laterOf(member?.paid_until, data.next_payment_date ?? null),
      })
      break
    }

    case 'subscription.not_renew':
      await saveMember(email, { status: 'non-renewing' })
      break

    case 'subscription.disable':
      // Access runs to the end of the period already paid for.
      await saveMember(email, { status: 'cancelled' })
      break

    case 'invoice.payment_failed':
      await saveMember(email, { status: 'attention' })
      break

    case 'invoice.update': {
      const sub = data.subscription
      if (data.paid && sub?.next_payment_date) {
        const member = await getMember(email)
        await saveMember(email, {
          status: memberStatus(sub.status ?? 'active'),
          paid_until: laterOf(member?.paid_until, sub.next_payment_date),
        })
      }
      break
    }
  }

  return new Response(null, { status: 200 })
}

/* ------------------------------------------------------------------ *
 * Reminders
 * ------------------------------------------------------------------ */

function sameSecret(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

/** "14 November 2026", in Lagos, where the members are. */
function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

interface Notice {
  kind: NoticeKind
  /** The moment the notice is about. */
  at: string
}

/** The one notice a member is due today, if any. */
function noticeFor(member: MemberRow, now: number): Notice | null {
  const paid = membershipOpen(member.paid_until, new Date(now))
  const inTrial = trialOpen(member.trial_ends_at, new Date(now))

  if (paid && member.paid_until) {
    const left = Date.parse(member.paid_until) - now
    if (left <= 0 || left > 3 * DAY) return null
    if (member.status === 'active' && member.paystack_subscription) return { kind: 'renewing', at: member.paid_until }
    // A failed renewal is Paystack's to chase; it emails the customer itself.
    if (member.status === 'attention') return null
    return { kind: 'ending', at: member.paid_until }
  }

  if (inTrial && member.trial_ends_at) {
    const left = Date.parse(member.trial_ends_at) - now
    return left <= 30 * 60 * 60 * 1000 ? { kind: 'trial-ending', at: member.trial_ends_at } : null
  }

  // Closed: say so once, within two days of it closing.
  const paidEnd = member.paid_until ? Date.parse(member.paid_until) + MEMBERSHIP_GRACE_DAYS * DAY : 0
  const trialEnd = member.trial_ends_at ? Date.parse(member.trial_ends_at) : 0
  const closed = Math.max(paidEnd, trialEnd)
  if (closed && now - closed >= 0 && now - closed < 2 * DAY) {
    return { kind: 'ended', at: new Date(closed).toISOString() }
  }
  return null
}

async function reminders(req: Request): Promise<Response> {
  if (!sameSecret(req.headers.get('x-cron-secret'), env('CRON_SECRET'))) {
    return new Response(null, { status: 401 })
  }
  const now = Date.now()
  const at = (offset: number) => encodeURIComponent(new Date(now + offset).toISOString())
  // Everyone whose trial or paid period ends within the next few days
  // or ended within the last few: a small slice of the table.
  const filter =
    `or=(and(trial_ends_at.gte.${at(-3 * DAY)},trial_ends_at.lte.${at(2 * DAY)}),` +
    `and(paid_until.gte.${at(-(MEMBERSHIP_GRACE_DAYS + 3) * DAY)},paid_until.lte.${at(4 * DAY)}))&limit=2000`
  const rows = await select<MemberRow>(db(), 'members', `select=*&${filter}`)

  let sent = 0
  for (const row of rows) {
    let member = row
    let notice = noticeFor(member, now)
    if (!notice) continue
    // Before telling someone their access is over, make sure it is: a
    // renewal whose webhook went missing must not read as an ending.
    if (notice.kind === 'ended' || notice.kind === 'ending') {
      member = await refreshMember(member)
      notice = noticeFor(member, now)
      if (!notice) continue
    }
    const key = `${notice.kind}:${notice.at.slice(0, 10)}`
    if (member.last_notice === key) continue

    const planLabel = member.plan ? PLANS[member.plan].label : undefined
    let amount: string | undefined
    if (notice.kind === 'renewing' && member.plan) {
      const price = await planPrice(member.plan)
      if (price) amount = formatAmount(price.amount, price.currency)
    }
    try {
      await sendMail(noticeMail(member.email, notice.kind, { date: longDate(notice.at), planLabel, amount }))
      await saveMember(member.email, { last_notice: key })
      sent++
    } catch (error) {
      console.error(`[billing] ${notice.kind} reminder failed`, error)
    }
  }
  console.log(`[billing] reminders: ${sent} sent of ${rows.length} checked`)
  return jsonResponse({ checked: rows.length, sent }, 200)
}

/* ------------------------------------------------------------------ */

serve(async (req) => {
  const origin = req.headers.get('origin') ?? undefined
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, origin)

  const route = new URL(req.url).pathname.split('/').pop()
  try {
    // Paystack and the scheduler are not rate-limited by IP: a burst of
    // real events must not be refused. Their secrets keep everyone else out.
    if (route === 'webhook') return await webhook(req)
    if (route === 'reminders') return await reminders(req)

    const limit = await checkLimits(req, 'billing')
    if (!limit.allowed) return limitResponse(limit, origin)
    if (route === 'checkout') return await checkout(req, origin)
    if (route === 'trial') return await trial(req, origin)
    if (route === 'manage') return await manage(req, origin)
    return jsonResponse({ error: 'Not found' }, 404, origin)
  } catch (error) {
    console.error(`[billing] ${route} failed`, error)
    if (route === 'webhook' || route === 'reminders') return new Response(null, { status: 500 })
    return jsonResponse({ error: 'Payment is briefly unavailable. Try again in a minute.' }, 502, origin)
  }
})
