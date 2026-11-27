import type {
  BillingLinkResponse,
  MembershipResponse,
  PlanId,
  TransferInfoResponse,
  TransferSummary,
} from '../../../src/lib/types.ts'
import {
  BANK_REFERENCE_PATTERN,
  APP_PACKAGE,
  MAX_RECEIPT_BYTES,
  MEMBERSHIP_GRACE_DAYS,
  PLANS,
  RETURN_HOST,
  RETURN_SCHEME,
  SENDER_NAME_PATTERN,
  TRANSFER_MAX_AGE_DAYS,
  TRIAL_DAYS,
  cardTooEarly,
  formatAmount,
  isPlanId,
  membershipOpen,
  plausiblePaidOn,
  tidyText,
  trialOpen,
} from '../../../src/lib/types.ts'
import { BodyTooLarge, readJson, readText } from '../_shared/body.ts'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { noticeMail, sendMail, type NoticeKind } from '../_shared/email.ts'
import { env, serve } from '../_shared/env.ts'
import { scanJpeg } from '../_shared/image-scan.ts'
import { checkKeyLimit, checkLimits, limitResponse } from '../_shared/limits.ts'
import {
  accountOf,
  activePromo,
  latestTransfer,
  promoForReceipt,
  promoLabel,
  pruneReceipts,
  readSettings,
  toSummary,
  transferPlans,
  type TransferRow,
} from '../_shared/transfers.ts'
import {
  appendNote,
  autoRenewing,
  membershipFor,
  refreshMember,
  reverseCharge,
  trialAvailable,
} from '../_shared/membership.ts'
import { db, getMember, laterOf, recordCharge, saveMember, trialKey, type MemberRow } from '../_shared/members.ts'
import {
  fetchSubscription,
  manageLink,
  memberStatus,
  planCodeFor,
  planIdFor,
  planPrice,
  returnFallback,
  startCheckout,
  verifyPaystackSignature,
} from '../_shared/paystack.ts'
import { RECEIPT_BUCKET, insertReturning, removeObjects, select, uploadObject, upsert } from '../_shared/supabase.ts'
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
 *   renewing and ended emails, each sent once, and deleting receipt
 *   images 90 days after their decision.
 * - `POST billing/transfer-info` (member token) answers the bank account,
 *   the plans at their transfer price and the member's latest transfer.
 * - `POST billing/transfer` (member token) sends a bank transfer receipt
 *   for a person to approve on the admin site (migration 0009).
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
  // A card plan starts the day it is paid. Bought while paid time is
  // still running it would add nothing for those days, so it waits
  // until that time is nearly up (`CARD_EARLY_DAYS`). 400, not 409: the
  // phone reads 409 here as "a card subscription is still live".
  if (cardTooEarly(member?.paid_until)) {
    return jsonResponse(
      {
        error: `You are already paid up until ${longDate(member!.paid_until!)}. A card plan starts the day you pay, so it can be started from that day; the app stays open three days past it. To pay sooner, use bank transfer, which adds on to the time you have.`,
      },
      400,
      origin,
    )
  }
  // A subscription Paystack still charges — a renewal it is retrying
  // (`attention`), or an active one whose period looks lapsed here — would
  // carry on charging beside a new one. Ask Paystack, since a missed
  // webhook can leave the row stale either way.
  if (member?.paystack_subscription) {
    const sub = await fetchSubscription(member.paystack_subscription)
    if (sub.status === 'active' || sub.status === 'attention') {
      await saveMember(session.sub, { status: memberStatus(sub.status) })
      return jsonResponse(
        {
          error:
            sub.status === 'attention'
              ? 'Your last renewal didn’t go through, and Paystack is still trying that card. Update the card under Manage or cancel — or cancel there, then choose a plan here.'
              : 'You already have a plan that renews by itself. To switch plans, cancel it first under Manage or cancel, then choose the new one.',
        },
        409,
        origin,
      )
    }
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

/* ------------------------------------------------------------------ *
 * Bank transfer
 * ------------------------------------------------------------------ */

/** The account, the plans at their transfer price, and this member's latest transfer. */
async function transferInfo(req: Request, origin?: string): Promise<Response> {
  const session = await bearer(req, 'member')
  if (!session) return jsonResponse({ error: 'Sign in with your email first.' }, 401, origin)
  const [settings, latest] = await Promise.all([readSettings(), latestTransfer(session.sub)])
  const promo = activePromo(settings)
  return jsonResponse(
    {
      account: accountOf(settings),
      plans: transferPlans(settings, promo),
      promo,
      latest: latest ? toSummary(latest) : null,
    } satisfies TransferInfoResponse,
    200,
    origin,
  )
}

/** Base64 of the receipt plus a few hundred bytes of fields, and nothing bigger is read. */
const MAX_TRANSFER_BODY = Math.ceil((MAX_RECEIPT_BYTES * 4) / 3) + 8 * 1024
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/
const CLIENT_ID = /^[A-Za-z0-9_-]{1,100}$/

interface ValidTransfer {
  clientId: string
  plan: PlanId
  senderName: string
  paidOn: string
  bankReference: string | null
  receipt: Uint8Array
}

/**
 * Every field of `TransferRequest`, checked as if the screen did not
 * exist: a public endpoint cannot trust the form that usually calls it.
 * Text is tidied, capped and held to a character set; the date has to
 * be a real day in the last 30; the receipt has to decode, fit under the
 * byte ceiling and start like a JPEG before `scanJpeg` looks at the rest.
 */
function validTransfer(raw: unknown): ValidTransfer | string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'Expected a form.'
  const b = raw as Record<string, unknown>

  const clientId = typeof b.clientId === 'string' ? b.clientId : ''
  if (!CLIENT_ID.test(clientId)) return 'Something went wrong with the form. Close it and try again.'

  if (!isPlanId(b.plan)) return 'Choose Monthly, 6 Months or Annual.'

  const senderName = typeof b.senderName === 'string' ? tidyText(b.senderName) : ''
  if (!SENDER_NAME_PATTERN.test(senderName)) {
    return 'Enter the name on the account you paid from: letters and spaces, 2 to 80 characters.'
  }

  const paidOn = typeof b.paidOn === 'string' ? b.paidOn : ''
  if (!plausiblePaidOn(paidOn)) {
    return `Enter the day you made the transfer: today or within the last ${TRANSFER_MAX_AGE_DAYS} days.`
  }

  let bankReference: string | null = null
  if (b.bankReference !== undefined && b.bankReference !== null && b.bankReference !== '') {
    const ref = typeof b.bankReference === 'string' ? tidyText(b.bankReference) : ''
    if (!BANK_REFERENCE_PATTERN.test(ref)) {
      return 'The reference can only hold letters, numbers, spaces and / _ -, up to 60 characters.'
    }
    bankReference = ref
  }

  const encoded = typeof b.receiptBase64 === 'string' ? b.receiptBase64 : ''
  const data = encoded.startsWith('data:') ? encoded.slice(encoded.indexOf(',') + 1) : encoded
  if (!data || !BASE64.test(data)) return 'Attach a picture of your receipt.'
  if (Math.floor((data.length * 3) / 4) > MAX_RECEIPT_BYTES + 2) return 'That picture is too large. Use a screenshot.'
  let receipt: Uint8Array
  try {
    receipt = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  } catch {
    return 'Attach a picture of your receipt.'
  }
  if (receipt.length === 0 || receipt.length > MAX_RECEIPT_BYTES) return 'That picture is too large. Use a screenshot.'
  if (!(receipt[0] === 0xff && receipt[1] === 0xd8 && receipt[2] === 0xff)) {
    return 'The receipt has to be a picture (a screenshot or a photo), not a PDF or another file.'
  }

  return { clientId, plan: b.plan, senderName, paidOn, bankReference, receipt }
}

/**
 * Send a transfer for approval.
 *
 * The receipt never goes to the database. It is checked by `scanJpeg`
 * (malformed files, absurd sizes, script or a second file hidden in it
 * are refused) and rebuilt from the picture alone, and the *rebuilt*
 * bytes go to the private receipt bucket; the row holds only the path
 * and the fingerprint.
 */
async function transfer(req: Request, origin?: string): Promise<Response> {
  const session = await bearer(req, 'member')
  if (!session) return jsonResponse({ error: 'Sign in with your email first.' }, 401, origin)
  const email = session.sub

  // Ten tries a day per member (typos included), on top of the per-IP limit.
  if (!(await checkKeyLimit(`transfer:${email}`, 10, 86_400))) {
    return jsonResponse({ error: 'Too many receipts today. Try again tomorrow, or write to support@afrocoils.app.' }, 429, origin)
  }

  let raw: unknown
  try {
    raw = await readJson(req, MAX_TRANSFER_BODY)
  } catch (error) {
    if (error instanceof BodyTooLarge) {
      return jsonResponse({ error: 'That picture is too large. Use a screenshot.' }, 413, origin)
    }
    return jsonResponse({ error: 'Expected a form.' }, 400, origin)
  }
  const input = validTransfer(raw)
  if (typeof input === 'string') return jsonResponse({ error: input }, 400, origin)

  // The same submission arriving again after a lost response: answer
  // with what was stored, and store nothing new.
  const [again] = await select<TransferRow>(db(), 'transfers', `client_id=eq.${encodeURIComponent(input.clientId)}&limit=1`)
  if (again) {
    if (again.email !== email) return jsonResponse({ error: 'Something went wrong with the form. Close it and try again.' }, 409, origin)
    return jsonResponse(toSummary(again) satisfies TransferSummary, 200, origin)
  }

  const settings = await readSettings()
  // Priced by the promotion running on the day the money was sent, if any.
  const promo = promoForReceipt(settings, input.paidOn)
  const offer = transferPlans(settings, promo).find((p) => p.id === input.plan)
  if (!offer) {
    return jsonResponse({ error: `The ${PLANS[input.plan].label} plan can’t be paid by transfer just now. Choose another.` }, 409, origin)
  }

  const member = await getMember(email)
  if (autoRenewing(member)) {
    return jsonResponse({ error: 'You already have a plan that renews by itself, so there is nothing to pay.' }, 409, origin)
  }
  const latest = await latestTransfer(email)
  if (latest?.status === 'Pending') {
    return jsonResponse({ error: 'Your last receipt is still being checked. We’ll email you as soon as it is.' }, 409, origin)
  }

  const verdict = await scanJpeg(input.receipt)
  if (!verdict.ok) {
    console.warn(`[billing] receipt refused by the image check: ${verdict.reason}`)
    return jsonResponse(
      { error: 'That picture didn’t pass our security check. Take a fresh screenshot of the receipt and attach that.' },
      422,
      origin,
    )
  }

  const [seen] = await select<{ id: string }>(
    db(),
    'transfers',
    `receipt_sha256=eq.${verdict.sha256}&status=neq.Rejected&select=id&limit=1`,
  )
  if (seen) return jsonResponse({ error: 'This receipt has already been sent.' }, 409, origin)

  const id = `trf_${crypto.randomUUID()}`
  const key = `${id}.jpg`
  await uploadObject(db(), key, verdict.bytes, 'image/jpeg', RECEIPT_BUCKET)
  try {
    const row = await insertReturning<TransferRow>(db(), 'transfers', {
      id,
      client_id: input.clientId,
      email,
      plan: input.plan,
      amount: offer.amount,
      currency: offer.currency,
      sender_name: input.senderName,
      paid_on: input.paidOn,
      bank_reference: input.bankReference,
      receipt_key: key,
      receipt_sha256: verdict.sha256,
      promo: promo && offer.fullAmount ? promoLabel(promo) : null,
    })
    console.log(`[billing] transfer ${id} waiting for review (${verdict.width}x${verdict.height}, ${verdict.stripped} bytes stripped)`)
    return jsonResponse(toSummary(row!) satisfies TransferSummary, 201, origin)
  } catch (error) {
    // Nothing points at the image now: take it back out.
    await removeObjects(db(), [key], RECEIPT_BUCKET).catch((e) => console.error('[billing] receipt cleanup failed', e))
    // A unique index lost a race: a second pending transfer, or the same receipt.
    if (error instanceof Error && error.message.includes('(409)')) {
      return jsonResponse({ error: 'This receipt, or another of yours, is already waiting to be checked.' }, 409, origin)
    }
    throw error
  }
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
    /** Refund events: the charge refunded. */
    transaction_reference?: string
    /** Dispute events: the charge disputed. */
    transaction?: { reference?: string; amount?: number } | null
    refund_amount?: number | null
    resolution?: string | null
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

    // Refunds are made in the Paystack dashboard; this is how the
    // membership hears of one. Only `processed` means the money went back.
    case 'refund.processed': {
      const reference = data.transaction_reference ?? data.transaction?.reference
      if (!reference) break
      await reverseCharge({ reference, kind: 'refund', amount: data.amount })
      break
    }

    // A chargeback opened is not yet lost: note it, change nothing.
    case 'charge.dispute.create': {
      const member = await getMember(email)
      const reference = data.transaction?.reference ?? 'a payment'
      if (member) await saveMember(email, { note: appendNote(member.note, `chargeback opened on ${reference}`) })
      break
    }

    // `declined` is the dispute thrown out (the charge stands); any other
    // resolution, `merchant-accepted` included, sends the money back.
    case 'charge.dispute.resolve': {
      const reference = data.transaction?.reference
      if (!reference || !data.resolution || data.resolution === 'declined') break
      await reverseCharge({ reference, kind: 'chargeback', amount: data.refund_amount ?? undefined })
      break
    }

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
  // Receipt images 90 days past their decision go too (the row stays).
  const pruned = await pruneReceipts().catch((error) => {
    console.error('[billing] receipt pruning failed', error)
    return 0
  })
  console.log(`[billing] reminders: ${sent} sent of ${rows.length} checked; ${pruned} old receipts deleted`)
  return jsonResponse({ checked: rows.length, sent, pruned }, 200)
}

/* ------------------------------------------------------------------ *
 * Coming back from Paystack
 * ------------------------------------------------------------------ */

/**
 * `GET billing/return`: where Paystack sends the browser once a payment
 * is made. It answers with a redirect into the app, so the member is
 * back where they started without finding the app again by hand.
 *
 * The redirect is an Android intent link for `afrocoils://joined`,
 * limited to this app's package, with the "go back to the app" page as
 * its fallback: a browser that cannot open the app (a copy from before
 * the link existed, or a desktop) shows that page instead, which is
 * what everyone saw before.
 *
 * It trusts nothing and records nothing. Paystack adds the payment's
 * reference to the address; it is not read here, because the phone
 * finds out about the payment from the webhook and the status check,
 * never from a link someone could type.
 */
function returnToApp(): Response {
  const fallback = returnFallback()
  const intent =
    `intent://${RETURN_HOST}#Intent;scheme=${RETURN_SCHEME};package=${APP_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};end`
  return new Response(null, {
    status: 302,
    headers: { Location: intent, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  })
}

/* ------------------------------------------------------------------ */

serve(async (req) => {
  const origin = req.headers.get('origin') ?? undefined
  const route = new URL(req.url).pathname.split('/').pop()
  if (req.method === 'GET' && route === 'return') return returnToApp()
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, origin)

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
    if (route === 'transfer-info') return await transferInfo(req, origin)
    if (route === 'transfer') return await transfer(req, origin)
    return jsonResponse({ error: 'Not found' }, 404, origin)
  } catch (error) {
    console.error(`[billing] ${route} failed`, error)
    if (route === 'webhook' || route === 'reminders') return new Response(null, { status: 500 })
    return jsonResponse({ error: 'Payment is briefly unavailable. Try again in a minute.' }, 502, origin)
  }
})
