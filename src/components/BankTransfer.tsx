import { useEffect, useRef, useState, type FormEvent } from 'react'
import Icon from './Icon'
import PromoBanner from './PromoBanner'
import { addDays, dateKey } from '../lib/calendar'
import { MembershipError, longDate, sendTransfer, transferInfo } from '../lib/membership'
import { PhotoError, photosAvailable, pickReceipt, type PhotoSource } from '../lib/photos'
import {
  BANK_REFERENCE_PATTERN,
  MAX_RECEIPT_BYTES,
  PLANS,
  RECEIPT_KEEP_DAYS,
  SENDER_NAME_PATTERN,
  TRANSFER_MAX_AGE_DAYS,
  formatAmount,
  plausiblePaidOn,
  tidyText,
  type PlanId,
  type TransferInfoResponse,
  type TransferSummary,
} from '../lib/types'

/**
 * Paying by bank transfer, on `/join` (added 2026-11-20).
 *
 * 1. The member picks a plan and is shown the account and the exact
 *    amount, each with a copy button.
 * 2. After paying from their own bank they fill in the name on the
 *    account they paid from, the day, the bank's reference if there is
 *    one, and attach a screenshot of the receipt.
 * 3. A person checks it against the bank statement on the admin site.
 *    Approving opens the plan and emails them; until then this shows the
 *    receipt as being checked, and "Check again" asks the server.
 *
 * Every field is checked here for the member's sake and again on the
 * server, which is the check that counts. The receipt is held in memory
 * until it is sent and never written to the phone or the profile.
 */

interface Props {
  token: string
  email: string
  /** Ask the server for the membership again: an approval opens the app from there. */
  onRecheck: () => void
  busyOutside: boolean
}

type Info = TransferInfoResponse | null | undefined

const newClientId = () => `trf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export default function BankTransfer({ token, email, onRecheck, busyOutside }: Props) {
  const [info, setInfo] = useState<Info>(undefined)
  const [plan, setPlan] = useState<PlanId | null>(null)
  const [senderName, setSenderName] = useState('')
  const [paidOn, setPaidOn] = useState(() => dateKey(new Date()))
  const [reference, setReference] = useState('')
  const [receipt, setReceipt] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const clientId = useRef(newClientId())

  const load = () => {
    setError(null)
    void transferInfo(token)
      .then((next) => {
        setInfo(next)
        setPlan((current) => (current && next.plans.some((p) => p.id === current) ? current : (next.plans[0]?.id ?? null)))
      })
      .catch((e: unknown) => {
        setInfo(null)
        setError(e instanceof MembershipError ? e.message : 'Couldn’t load the bank details. Check your connection.')
      })
  }

  useEffect(load, [token])

  if (info === undefined) {
    return <p className="font-body-md text-caption text-on-surface-variant">Loading the bank details…</p>
  }
  if (info === null) {
    return (
      <div>
        {error && <Alert text={error} />}
        <button type="button" onClick={load} className="font-body-md text-caption text-primary underline">
          Try again
        </button>
      </div>
    )
  }
  if (!info.account || info.plans.length === 0) {
    return (
      <p className="rounded-xl bg-surface-container p-md font-body-md text-caption text-on-surface">
        Paying by bank transfer isn&rsquo;t available just now. Write to support@afrocoils.app if you need it.
      </p>
    )
  }

  const latest = info.latest
  if (latest?.status === 'Pending') {
    return <Waiting transfer={latest} email={email} busy={busyOutside} onCheck={() => (load(), onRecheck())} />
  }

  const offer = info.plans.find((p) => p.id === plan) ?? null
  const account = info.account
  const today = dateKey(new Date())
  const earliest = addDays(today, -TRANSFER_MAX_AGE_DAYS)

  const name = tidyText(senderName)
  const ref = tidyText(reference)
  const problems = {
    name: SENDER_NAME_PATTERN.test(name) ? null : 'Enter the name on the account you paid from (letters and spaces).',
    paidOn: plausiblePaidOn(paidOn) ? null : `Choose today or a day in the last ${TRANSFER_MAX_AGE_DAYS} days.`,
    reference: !ref || BANK_REFERENCE_PATTERN.test(ref) ? null : 'Letters, numbers, spaces and / _ - only, up to 60.',
    receipt: receipt ? null : 'Attach a screenshot or photo of the receipt.',
  }
  const valid = !!offer && Object.values(problems).every((p) => p === null)

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 2000)
    } catch {
      setCopied(null)
    }
  }

  async function attach(source: PhotoSource) {
    setError(null)
    try {
      const base64 = await pickReceipt(source)
      if (Math.floor((base64.length * 3) / 4) > MAX_RECEIPT_BYTES) {
        setError('That picture is too large. Use a screenshot of the receipt instead.')
        return
      }
      setReceipt(base64)
    } catch (e) {
      if (e instanceof PhotoError && e.cancelled) return
      setError(e instanceof Error ? e.message : 'Couldn’t open the picture.')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!valid || !offer || !receipt) return
    setBusy(true)
    setError(null)
    try {
      const sent = await sendTransfer(token, {
        clientId: clientId.current,
        plan: offer.id,
        senderName: name,
        paidOn,
        bankReference: ref || undefined,
        receiptBase64: receipt,
      })
      clientId.current = newClientId()
      setReceipt(null)
      setInfo({ ...info!, latest: sent })
    } catch (e) {
      setError(e instanceof MembershipError ? e.message : 'Couldn’t send it. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const show = (problem: string | null) => (touched && problem ? problem : null)

  return (
    <form onSubmit={submit} noValidate>
      {latest?.status === 'Approved' && (
        <div role="status" className="mb-md rounded-xl bg-secondary-fixed/40 p-md font-body-md text-caption text-on-surface">
          <p className="font-bold">
            Your last transfer was approved{latest.reviewedISO ? ` on ${longDate(latest.reviewedISO)}` : ''}.
          </p>
          <p className="mt-xs">
            {PLANS[latest.plan].label}, {formatAmount(latest.amount, latest.currency)}. There is nothing more
            to send for it; the form below is for paying again when that plan is ending.
          </p>
        </div>
      )}
      {latest?.status === 'Rejected' && (
        <div className="mb-md rounded-xl bg-error-container p-md font-body-md text-caption text-on-error-container">
          <p className="font-bold">Your last receipt wasn&rsquo;t approved.</p>
          {latest.note && <p className="mt-xs">{latest.note}</p>}
          <p className="mt-xs">You can send it again below with the details corrected.</p>
        </div>
      )}

      {info.promo && <PromoBanner promo={info.promo} />}

      <p className="mb-sm font-label-md text-label-md text-on-surface">1. Choose a plan</p>
      <div role="radiogroup" aria-label="Plans paid by transfer" className="mb-md space-y-xs">
        {info.plans.map((p) => {
          const selected = p.id === plan
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPlan(p.id)}
              className={`flex w-full items-center gap-md rounded-2xl p-md text-left transition-all active:scale-[0.98] ${
                selected ? 'bg-inverse-surface text-inverse-on-surface shadow-card' : 'bg-surface-container text-on-surface'
              }`}
            >
              <Icon name={selected ? 'check_circle' : 'radio_button_unchecked'} className="shrink-0 text-[22px]" />
              <span className="flex-1 font-label-md text-body-md font-bold">{PLANS[p.id].label}</span>
              <span className="text-right">
                {p.fullAmount && (
                  <s className="mr-xs font-body-md text-caption opacity-75">
                    <span className="sr-only">was </span>
                    {formatAmount(p.fullAmount, p.currency)}
                  </s>
                )}
                <span className="font-headline-md text-body-lg font-bold">{formatAmount(p.amount, p.currency)}</span>
              </span>
            </button>
          )
        })}
      </div>

      <p className="mb-sm font-label-md text-label-md text-on-surface">2. Transfer exactly this amount</p>
      <dl className="mb-md divide-y divide-outline-variant/40 rounded-2xl bg-surface-container p-md font-body-md text-body-md">
        {[
          ['Amount', offer ? formatAmount(offer.amount, offer.currency) : '—', offer ? (offer.amount / 100).toFixed(offer.amount % 100 ? 2 : 0) : ''],
          ['Bank', account.bankName, ''],
          ['Account number', account.accountNumber, account.accountNumber],
          ['Account name', account.accountName, ''],
        ].map(([label, value, copyValue]) => (
          <div key={label} className="flex items-center gap-sm py-xs">
            <dt className="w-32 shrink-0 text-caption text-on-surface-variant">{label}</dt>
            <dd className="min-w-0 flex-1 break-words font-bold text-on-surface">{value}</dd>
            {copyValue && (
              <button
                type="button"
                onClick={() => void copy(label!, copyValue)}
                aria-label={`Copy ${label}`}
                className="flex shrink-0 items-center gap-xs rounded-full bg-surface-container-high px-sm py-1 font-label-md text-[12px] font-bold text-on-surface"
              >
                <Icon name={copied === label ? 'check' : 'content_copy'} className="text-[16px]" />
                {copied === label ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        ))}
      </dl>

      <p className="mb-sm font-label-md text-label-md text-on-surface">3. Tell us about the transfer</p>
      <Field id="tr-name" label="Name on the account you paid from" error={show(problems.name)}>
        <input
          id="tr-name"
          autoComplete="name"
          maxLength={80}
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field id="tr-date" label="Day you paid" error={show(problems.paidOn)}>
        <input
          id="tr-date"
          type="date"
          min={earliest}
          max={today}
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field
        id="tr-ref"
        label="Reference or session ID (optional)"
        hint="If your receipt shows one, it helps us find your payment faster."
        error={show(problems.reference)}
      >
        <input
          id="tr-ref"
          maxLength={60}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className={fieldClass}
        />
      </Field>

      <p className="mb-xs font-label-md text-label-md text-on-surface">4. Attach the receipt</p>
      <p className="mb-sm font-body-md text-caption text-on-surface-variant">
        A screenshot from your banking app, or a photo of the printed slip. Pictures only, not PDFs.
      </p>
      {receipt ? (
        <div className="mb-md flex items-center gap-md rounded-2xl bg-surface-container p-sm">
          <img
            src={`data:image/jpeg;base64,${receipt}`}
            alt="The receipt you attached"
            className="h-24 w-20 rounded-xl object-cover"
          />
          <div className="flex-1 font-body-md text-caption text-on-surface">Receipt attached.</div>
          <button type="button" onClick={() => setReceipt(null)} className="font-body-md text-caption text-primary underline">
            Remove
          </button>
        </div>
      ) : photosAvailable() ? (
        <div className="mb-xs grid grid-cols-2 gap-sm">
          <PickButton icon="image" label="Choose screenshot" onClick={() => void attach('gallery')} />
          <PickButton icon="photo_camera" label="Take a photo" onClick={() => void attach('camera')} />
        </div>
      ) : (
        <p className="mb-xs font-body-md text-caption text-on-surface-variant">
          Attaching a receipt needs the AfroCoils app on your phone.
        </p>
      )}
      {show(problems.receipt) && <p className="mb-md font-body-md text-caption text-error">{problems.receipt}</p>}

      {error && <Alert text={error} />}

      <button
        type="submit"
        disabled={busy || busyOutside}
        className="mt-md mb-sm flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg font-bold text-on-secondary shadow-card transition-all active:scale-95 disabled:opacity-60"
      >
        <Icon name="send" className="text-[20px]" />
        {busy ? 'Sending…' : 'Send for approval'}
      </button>
      <p className="font-body-md text-caption text-on-surface-variant">
        A person checks every receipt against our bank statement, usually within one working day,
        and we email {email} when it&rsquo;s approved. The receipt picture is kept privately for
        checking and deleted {RECEIPT_KEEP_DAYS} days after the decision.
      </p>
    </form>
  )
}

function Waiting({
  transfer,
  email,
  busy,
  onCheck,
}: {
  transfer: TransferSummary
  email: string
  busy: boolean
  onCheck: () => void
}) {
  return (
    <div role="status" className="rounded-2xl bg-secondary-fixed/40 p-md font-body-md text-body-md text-on-surface">
      <p className="mb-xs flex items-center gap-sm font-bold">
        <Icon name="schedule" className="text-[20px]" />
        Your receipt is being checked
      </p>
      <p className="mb-md text-caption">
        {PLANS[transfer.plan].label}, {formatAmount(transfer.amount, transfer.currency)}, sent{' '}
        {longDate(transfer.submittedISO)}. We check it against our bank statement, usually within
        one working day, and email {email} as soon as it&rsquo;s approved. The app opens by itself then.
      </p>
      <button
        type="button"
        onClick={onCheck}
        disabled={busy}
        className="flex w-full items-center justify-center rounded-full bg-surface-container-high py-3 font-label-md text-label-md font-bold text-on-surface transition-all active:scale-95 disabled:opacity-60"
      >
        Check again
      </button>
    </div>
  )
}

const fieldClass =
  'w-full rounded-xl border-outline-variant bg-surface px-md py-3 font-body-md text-body-md text-on-surface focus:border-secondary focus:ring-secondary'

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error: string | null
  children: React.ReactNode
}) {
  return (
    <div className="mb-md">
      <label htmlFor={id} className="mb-xs block font-body-md text-caption font-bold text-on-surface">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-xs font-body-md text-caption text-on-surface-variant">{hint}</p>}
      {error && <p className="mt-xs font-body-md text-caption text-error">{error}</p>}
    </div>
  )
}

function PickButton({ icon, label, onClick }: { icon: 'image' | 'photo_camera'; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-xs rounded-2xl bg-surface-container py-3 font-label-md text-label-md font-bold text-on-surface transition-all active:scale-95"
    >
      <Icon name={icon} className="text-[20px]" />
      {label}
    </button>
  )
}

function Alert({ text }: { text: string }) {
  return (
    <p role="alert" className="mb-md rounded-xl bg-error-container p-md font-body-md text-caption text-on-error-container">
      {text}
    </p>
  )
}
