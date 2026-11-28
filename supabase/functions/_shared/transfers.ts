/**
 * Paying by bank transfer: the settings, the queue, and the two
 * decisions an admin makes on it.
 *
 * `billing/transfer-info` and `billing/transfer` (the member) and
 * `admin/transfers`, `admin/transfer` and `admin/transfer-settings` (the
 * admin site) all go through here, so the rules are written once:
 *
 * - The amount is the server's. A transfer records what the plan cost
 *   in `transfer_settings` when the receipt arrived; nothing the phone
 *   sends decides what was owed.
 * - A decision is a compare-and-set on `status = Pending`, so two admins
 *   clicking at once cannot open a plan twice.
 * - Approving opens the plan from the later of today and the end of the
 *   period already paid for, so paying early never loses days.
 * - The receipt image lives in the private `payment-receipts` bucket,
 *   read through a ten-minute signed URL, and is deleted 90 days after
 *   the decision (`pruneReceipts`, from the daily run).
 */
import type {
  BankAccount,
  PlanId,
  PlanOffer,
  Promo,
  TransferStatus,
  TransferSummary,
} from '../../../src/lib/types.ts'
import {
  PLANS,
  PLAN_IDS,
  PROMO_MAX_PERCENT,
  RECEIPT_KEEP_DAYS,
  formatAmount,
  isDayKey,
  isPlanId,
  promoPrice,
} from '../../../src/lib/types.ts'
import { sendMail, transferMail } from './email.ts'
import { cardPromoAllowed } from './paystack.ts'
import { appendNote } from './membership.ts'
import { db, getMember, laterOf, monthsAfter, saveMember } from './members.ts'
import { RECEIPT_BUCKET, patch, removeObjects, select, signedPhotoUrl, upsert } from './supabase.ts'

const enc = encodeURIComponent
const DAY = 86_400_000

export interface TransferSettingsRow {
  id: 1
  enabled: boolean
  bank_name: string
  account_name: string
  account_number: string
  currency: string
  price_monthly: number | null
  price_biannual: number | null
  price_annual: number | null
  promo_name: string | null
  promo_percent: number | null
  promo_plans: PlanId[] | null
  promo_starts_at: string | null
  promo_ends_at: string | null
  /** Card checkout takes the promotion off the first payment too (migration 0012). */
  promo_card: boolean
  updated_at: string
  updated_by: string | null
}

export interface TransferRow {
  id: string
  client_id: string
  email: string
  plan: PlanId
  amount: number
  currency: string
  sender_name: string
  paid_on: string
  bank_reference: string | null
  receipt_key: string | null
  receipt_sha256: string
  status: TransferStatus
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  reviewer_note: string | null
  receipt_deleted_at: string | null
  promo: string | null
}

export class TransferRefusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

export async function readSettings(): Promise<TransferSettingsRow | undefined> {
  const [row] = await select<TransferSettingsRow>(db(), 'transfer_settings', 'id=eq.1&limit=1')
  return row
}

const PRICE_COLUMN: Record<PlanId, 'price_monthly' | 'price_biannual' | 'price_annual'> = {
  monthly: 'price_monthly',
  biannual: 'price_biannual',
  annual: 'price_annual',
}

/** The account to pay into, or null when transfers are off or not set up. */
export function accountOf(settings: TransferSettingsRow | undefined): BankAccount | null {
  if (!settings?.enabled) return null
  if (!settings.bank_name || !settings.account_name || !settings.account_number) return null
  return {
    bankName: settings.bank_name,
    accountName: settings.account_name,
    accountNumber: settings.account_number,
  }
}

/** The promotion set on the admin site, whether or not it is running. */
function promoOf(settings: TransferSettingsRow | undefined): (Promo & { startsISO: string }) | null {
  if (!settings?.promo_percent || !settings.promo_name || !settings.promo_starts_at || !settings.promo_ends_at) return null
  return {
    name: settings.promo_name,
    percentOff: Number(settings.promo_percent),
    plans: (settings.promo_plans ?? []).filter(isPlanId),
    startsISO: new Date(settings.promo_starts_at).toISOString(),
    endsISO: new Date(settings.promo_ends_at).toISOString(),
    // On card only where the admin asked for it *and* card promotions are
    // allowed on this server (a Paystack test key, or PAYSTACK_CARD_PROMO
    // switched on after a test-mode run).
    card: !!settings.promo_card && cardPromoAllowed(),
    transfer: !!accountOf(settings),
  }
}

/** The promotion running at `now`, as the phone is told it. Null: none. */
export function activePromo(settings: TransferSettingsRow | undefined, now: Date = new Date()): Promo | null {
  const promo = promoOf(settings)
  // Nothing to take it: transfers off and card not in it.
  if (!promo || (!promo.transfer && !promo.card)) return null
  const t = now.getTime()
  if (t < Date.parse(promo.startsISO) || t >= Date.parse(promo.endsISO)) return null
  return shown(promo)
}

const shown = (promo: Promo): Promo => ({
  name: promo.name,
  percentOff: promo.percentOff,
  plans: promo.plans,
  endsISO: promo.endsISO,
  card: promo.card,
  transfer: promo.transfer,
})

/** Days after a promotion ends in which a receipt for a transfer made during it still gets its price. */
const PROMO_RECEIPT_GRACE_DAYS = 3

/**
 * The promotion that prices a receipt: the one running when the money
 * was sent (`paidOn`, a day in Lagos), so a member who paid the promo
 * price on its last evening and sends the receipt the next morning is
 * not suddenly short. The reviewer still checks the day against the
 * bank statement.
 */
export function promoForReceipt(
  settings: TransferSettingsRow | undefined,
  paidOn: string,
  now: Date = new Date(),
): Promo | null {
  const promo = promoOf(settings)
  if (!promo || !accountOf(settings) || !isDayKey(paidOn)) return null
  // The whole of that day in Lagos (UTC+1).
  const dayStart = Date.parse(`${paidOn}T00:00:00+01:00`)
  const dayEnd = dayStart + DAY
  const starts = Date.parse(promo.startsISO)
  const ends = Date.parse(promo.endsISO)
  if (dayEnd <= starts || dayStart >= ends) return null
  if (now.getTime() < starts || now.getTime() >= ends + PROMO_RECEIPT_GRACE_DAYS * DAY) return null
  return shown(promo)
}

/** "Black Friday, 20% off": what a transfer row records about its discount. */
export const promoLabel = (promo: Promo) => `${promo.name}, ${promo.percentOff}% off`

/**
 * The plans that can be paid by transfer: those with a price, while
 * transfers are on. With a promotion, `amount` is the discounted price
 * and `fullAmount` the list price.
 */
export function transferPlans(settings: TransferSettingsRow | undefined, promo: Promo | null = null): PlanOffer[] {
  if (!accountOf(settings)) return []
  return PLAN_IDS.flatMap((id) => {
    const listed = settings![PRICE_COLUMN[id]]
    if (!listed) return []
    const amount = Number(listed)
    const offer: PlanOffer = { id, amount, currency: settings!.currency }
    if (promo?.plans.includes(id)) {
      const discounted = promoPrice(amount, promo.percentOff)
      if (discounted < amount) return [{ ...offer, amount: discounted, fullAmount: amount }]
    }
    return [offer]
  })
}

/**
 * Set or clear the promotion. `{ clear: true }` ends it now; otherwise a
 * name, a whole percentage (1–90), at least one plan, and a start and
 * end (ISO times, the end after the start and not already past).
 */
export async function savePromo(body: Record<string, unknown>, by: string): Promise<TransferSettingsRow> {
  let values: Record<string, unknown>
  if (body.clear === true) {
    values = { promo_name: null, promo_percent: null, promo_starts_at: null, promo_ends_at: null, promo_card: false }
  } else {
    const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : ''
    if (name.length < 1 || name.length > 60 || /[<>]/.test(name)) {
      throw new TransferRefusal(400, 'Give the promotion a name of up to 60 characters (no < or >)')
    }
    const percent = Number(body.percent)
    if (!Number.isInteger(percent) || percent < 1 || percent > PROMO_MAX_PERCENT) {
      throw new TransferRefusal(400, `The discount must be a whole number from 1 to ${PROMO_MAX_PERCENT} percent`)
    }
    const plans = Array.isArray(body.plans) ? [...new Set(body.plans.filter(isPlanId))] : []
    if (plans.length === 0) throw new TransferRefusal(400, 'Choose at least one plan for the promotion')
    const starts = typeof body.startsISO === 'string' ? Date.parse(body.startsISO) : NaN
    const ends = typeof body.endsISO === 'string' ? Date.parse(body.endsISO) : NaN
    if (Number.isNaN(starts) || Number.isNaN(ends)) throw new TransferRefusal(400, 'Set when the promotion starts and ends')
    if (ends <= starts) throw new TransferRefusal(400, 'The promotion has to end after it starts')
    if (ends <= Date.now()) throw new TransferRefusal(400, 'That end time has already passed')
    if (ends - starts > 366 * DAY) throw new TransferRefusal(400, 'A promotion can run for a year at most')
    values = {
      promo_name: name,
      promo_percent: percent,
      promo_plans: plans,
      promo_starts_at: new Date(starts).toISOString(),
      promo_ends_at: new Date(ends).toISOString(),
      promo_card: body.card === true,
    }
  }
  const [row] = await patch<TransferSettingsRow>(db(), 'transfer_settings', 'id=eq.1', {
    ...values,
    updated_at: new Date().toISOString(),
    updated_by: by,
  })
  if (!row) throw new Error('transfer_settings has no row: run migration 0009')
  return row
}

/** Validate and save what the admin site sends. Throws a TransferRefusal on bad input. */
export async function saveSettings(body: Record<string, unknown>, by: string): Promise<TransferSettingsRow> {
  const text = (value: unknown, max: number, label: string): string => {
    if (typeof value !== 'string') throw new TransferRefusal(400, `${label} is missing`)
    const tidy = value.replace(/\s+/g, ' ').trim()
    if (tidy.length > max) throw new TransferRefusal(400, `${label} is longer than ${max} characters`)
    if (/[<>]/.test(tidy)) throw new TransferRefusal(400, `${label} cannot contain < or >`)
    return tidy
  }
  const bankName = text(body.bankName, 80, 'Bank name')
  const accountName = text(body.accountName, 120, 'Account name')
  const accountNumber = text(body.accountNumber, 20, 'Account number').replace(/\s/g, '')
  if (accountNumber && !/^[0-9]{6,20}$/.test(accountNumber)) {
    throw new TransferRefusal(400, 'The account number must be 6 to 20 digits')
  }
  const enabled = body.enabled === true
  if (enabled && (!bankName || !accountName || !accountNumber)) {
    throw new TransferRefusal(400, 'Fill in the bank, account name and account number before switching transfers on')
  }

  const prices: Record<string, number | null> = {}
  for (const id of PLAN_IDS) {
    const raw = body[id]
    if (raw === null || raw === undefined || raw === '') {
      prices[PRICE_COLUMN[id]] = null
      continue
    }
    // Sent in naira (major units) from the form, stored in kobo.
    // Read as text so 1.10 is 110 kobo, not a float that misses by a hair.
    const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(String(raw).trim())
    const kobo = match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0')) : NaN
    if (!Number.isInteger(kobo) || kobo < 100 || kobo > 100_000_000) {
      throw new TransferRefusal(400, `The ${PLANS[id].label} price must be between 1 and 1,000,000, at most two decimals`)
    }
    prices[PRICE_COLUMN[id]] = kobo
  }
  if (enabled && Object.values(prices).every((p) => p === null)) {
    throw new TransferRefusal(400, 'Set a price for at least one plan before switching transfers on')
  }

  const [row] = await patch<TransferSettingsRow>(db(), 'transfer_settings', 'id=eq.1', {
    enabled,
    bank_name: bankName,
    account_name: accountName,
    account_number: accountNumber,
    ...prices,
    updated_at: new Date().toISOString(),
    updated_by: by,
  })
  if (!row) throw new Error('transfer_settings has no row: run migration 0009')
  return row
}

/* ------------------------------------------------------------------ *
 * The member's view
 * ------------------------------------------------------------------ */

export function toSummary(row: TransferRow): TransferSummary {
  return {
    id: row.id,
    plan: row.plan,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    submittedISO: new Date(row.submitted_at).toISOString(),
    reviewedISO: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    note: row.status === 'Rejected' ? row.reviewer_note : null,
  }
}

export async function latestTransfer(email: string): Promise<TransferRow | undefined> {
  const [row] = await select<TransferRow>(
    db(),
    'transfers',
    `email=eq.${enc(email)}&order=submitted_at.desc&limit=1`,
  )
  return row
}

/* ------------------------------------------------------------------ *
 * The admin's view and decisions
 * ------------------------------------------------------------------ */

export async function listTransfers(status: string) {
  const filter = (['Pending', 'Approved', 'Rejected'] as string[]).includes(status) ? `&status=eq.${status}` : ''
  // Oldest first while pending, so the bottom of the queue is read; newest first otherwise.
  const order = status === 'Pending' ? 'submitted_at.asc' : 'submitted_at.desc'
  const rows = await select<TransferRow>(db(), 'transfers', `select=*&order=${order}&limit=200${filter}`)
  return Promise.all(
    rows.map(async (row) => {
      const member = await getMember(row.email).catch(() => undefined)
      return {
        ...row,
        amount: Number(row.amount),
        // Ten minutes: long enough to compare with the statement, short
        // enough that a copied link does not outlive the session.
        receipt_url: row.receipt_key
          ? await signedPhotoUrl(db(), row.receipt_key, 600, RECEIPT_BUCKET).catch(() => null)
          : null,
        member_paid_until: member?.paid_until ?? null,
      }
    }),
  )
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })

/** Claim a pending transfer for a decision, or refuse if someone already decided it. */
async function claim(id: string, values: Record<string, unknown>): Promise<TransferRow> {
  if (!/^trf_[0-9a-f-]{36}$/.test(id)) throw new TransferRefusal(400, 'Not a transfer id')
  const [row] = await patch<TransferRow>(db(), 'transfers', `id=eq.${enc(id)}&status=eq.Pending`, values)
  if (!row) throw new TransferRefusal(409, 'That transfer has already been decided. Reload the list.')
  return row
}

export interface Decision {
  ok: true
  /** False when the decision stands but the email to the member failed to send. */
  mailed: boolean
  paidUntil?: string
}

/**
 * Approve: open the plan, record the payment, email the member.
 *
 * The status flips first, as a compare-and-set, so a second click finds
 * nothing to claim. If opening the plan then fails the claim is undone,
 * so the transfer is back in the queue rather than approved with no
 * membership behind it.
 */
export async function approveTransfer(id: string, by: string, note: string): Promise<Decision> {
  const now = new Date()
  const row = await claim(id, {
    status: 'Approved',
    reviewed_at: now.toISOString(),
    reviewed_by: by,
    reviewer_note: note || null,
  })

  let paidUntil: string
  try {
    const member = await getMember(row.email)
    // From the later of now and the end of what is already paid for.
    const from = laterOf(member?.paid_until, now.toISOString())!
    paidUntil = monthsAfter(from, PLANS[row.plan].months)
    await upsert(
      db(),
      'payments',
      [
        {
          reference: row.id,
          email: row.email,
          amount: row.amount,
          currency: row.currency,
          paid_at: `${row.paid_on}T12:00:00Z`,
          plan: row.plan,
          method: 'transfer',
        },
      ],
      { ignore: true },
    )
    await saveMember(row.email, {
      // A card subscription that is not renewing keeps its own status: a
      // transfer must not make it read as renewing by itself.
      status: member?.paystack_subscription ? member.status : 'active',
      source: member?.paystack_subscription ? 'paystack' : 'manual',
      plan: row.plan,
      period_start: from,
      paid_until: paidUntil,
      note: appendNote(member?.note, `${by}: transfer ${row.id} approved, ${PLANS[row.plan].label}`),
    })
  } catch (error) {
    await patch(db(), 'transfers', `id=eq.${enc(row.id)}`, {
      status: 'Pending',
      reviewed_at: null,
      reviewed_by: null,
      reviewer_note: null,
    }).catch((undo) => console.error('[transfers] could not undo a failed approval', undo))
    throw error
  }

  const mailed = await sendMail(
    transferMail(row.email, {
      approved: true,
      planLabel: PLANS[row.plan].label,
      amount: formatAmount(Number(row.amount), row.currency),
      paidOn: longDate(`${row.paid_on}T12:00:00Z`),
      until: longDate(paidUntil),
    }),
  )
    .then(() => true)
    .catch((error) => {
      console.error('[transfers] approval email failed', error)
      return false
    })
  return { ok: true, mailed, paidUntil }
}

/** Reject: the reason is required, because the member is emailed it. */
export async function rejectTransfer(id: string, by: string, reason: string): Promise<Decision> {
  if (reason.length < 5) throw new TransferRefusal(400, 'Write the reason the member will be emailed (at least 5 characters)')
  const row = await claim(id, {
    status: 'Rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: by,
    reviewer_note: reason,
  })
  const mailed = await sendMail(
    transferMail(row.email, {
      approved: false,
      planLabel: PLANS[row.plan].label,
      amount: formatAmount(Number(row.amount), row.currency),
      paidOn: longDate(`${row.paid_on}T12:00:00Z`),
      reason,
    }),
  )
    .then(() => true)
    .catch((error) => {
      console.error('[transfers] rejection email failed', error)
      return false
    })
  return { ok: true, mailed }
}

/**
 * Delete receipt images decided more than RECEIPT_KEEP_DAYS ago. The
 * row stays (the payment record), with the image's fingerprint, so the
 * same receipt still cannot pay twice. Called from the daily run.
 */
export async function pruneReceipts(): Promise<number> {
  const before = new Date(Date.now() - RECEIPT_KEEP_DAYS * DAY).toISOString()
  const rows = await select<Pick<TransferRow, 'id' | 'receipt_key'>>(
    db(),
    'transfers',
    `select=id,receipt_key&receipt_key=not.is.null&status=neq.Pending&reviewed_at=lt.${enc(before)}&limit=200`,
  )
  if (rows.length === 0) return 0
  await removeObjects(
    db(),
    rows.map((r) => r.receipt_key!),
    RECEIPT_BUCKET,
  )
  await patch(db(), 'transfers', `id=in.(${rows.map((r) => enc(r.id)).join(',')})`, {
    receipt_key: null,
    receipt_deleted_at: new Date().toISOString(),
  })
  return rows.length
}
