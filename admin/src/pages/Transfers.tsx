import { useEffect, useState } from 'react'
import type { PageProps } from '../App'
import { day, when, type TransferRow, type TransferSettings } from '../api'
import {
  PLANS,
  PLAN_IDS,
  PROMO_MAX_PERCENT,
  TRANSFER_STATUSES,
  formatAmount,
  promoPrice,
  type PlanId,
  type TransferStatus,
} from '../../../src/lib/types'
import { Button, Card, Facts, Field, ListState, PageHeader, Pill, Problem, SectionTitle, Segmented, checkbox, input } from '../ui'
import { useLoad } from './useLoad'

const STATUS_OPTIONS = TRANSFER_STATUSES.map((s) => ({ value: s, label: s }))

/**
 * Bank transfers waiting for a person.
 *
 * Check each one against the bank statement — the amount, the day, the
 * name on the sending account and the reference — before approving.
 * Approving opens the member's plan from the later of today and the end
 * of what they have already paid for, records the payment and emails
 * them. Rejecting emails them the reason you write, so write it for
 * them. Receipts are signed links that last ten minutes; reload the list
 * if one has expired. Images are deleted 90 days after the decision.
 */
export default function Transfers({ api, recount }: PageProps) {
  const [status, setStatus] = useState<TransferStatus>('Pending')
  const list = useLoad(() => api.get<TransferRow[]>('transfers', { status }), `transfers:${status}`)
  const changed = () => {
    list.reload()
    recount()
  }

  return (
    <>
      <PageHeader
        title="Bank transfers"
        lede="Match every receipt to a credit on the bank statement before approving: a screenshot can be edited. Approving opens the plan and emails the member; rejecting emails them your reason."
      >
        <Segmented label="Transfer status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </PageHeader>
      <Problem error={list.error} />
      <ListState data={list.data} error={list.error} empty={`Nothing ${status.toLowerCase()}.`} />
      <div className="space-y-lg">
        {list.data?.map((t) => (
          <Transfer key={t.id} api={api} row={t} onChange={changed} />
        ))}
      </div>
      <Settings api={api} />
      <PromoSettings api={api} />
    </>
  )
}

function Transfer({ api, row, onChange }: { api: PageProps['api']; row: TransferRow; onChange: () => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = row.status === 'Pending'

  async function decide(action: 'approve' | 'reject') {
    if (action === 'reject' && note.trim().length < 5) {
      setError('Write the reason first: it is emailed to the member.')
      return
    }
    const what = action === 'approve' ? `Approve ${formatAmount(row.amount, row.currency)} from ${row.email}?` : `Reject and email ${row.email} the reason?`
    if (!confirm(what)) return
    setBusy(true)
    setError(null)
    try {
      const result = await api.post<{ mailed: boolean }>('transfer', { id: row.id, action, note: note.trim() })
      // The card leaves this tab on reload, so say it now if the email failed.
      if (!result.mailed) alert(`Decided, but the email to ${row.email} did not send. Write to them from Mail.`)
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const facts: [string, string][] = [
    ['Member', row.email],
    ['Plan', PLANS[row.plan].label],
    ['Amount owed', formatAmount(row.amount, row.currency)],
    ...(row.promo ? ([['Promotion', row.promo]] as [string, string][]) : []),
    ['Name on sending account', row.sender_name],
    ['Day paid', day(`${row.paid_on}T12:00:00Z`)],
    ['Bank reference', row.bank_reference ?? '—'],
    ['Paid up until now', day(row.member_paid_until)],
    ['Receipt fingerprint', row.receipt_sha256.slice(0, 16)],
  ]
  if (!pending) {
    facts.push([
      'Decided',
      `${when(row.reviewed_at)} by ${row.reviewed_by}${row.reviewer_note ? ` — ${row.reviewer_note}` : ''}`,
    ])
  }
  const reasonId = `reason-${row.id}`

  return (
    <Card className="overflow-hidden !p-0">
      <div className="flex flex-wrap items-center justify-between gap-sm px-lg pt-lg">
        <h2 className="min-w-0 break-words text-lg font-bold text-on-surface">
          {formatAmount(row.amount, row.currency)} <span className="font-semibold text-on-surface-variant">from</span>{' '}
          {row.sender_name}
        </h2>
        <span className="flex items-center gap-sm text-xs text-on-surface-variant">
          Sent {when(row.submitted_at)}
          <Pill tone={row.status === 'Approved' ? 'good' : row.status === 'Rejected' ? 'bad' : 'warn'}>{row.status}</Pill>
        </span>
      </div>

      <div className="grid gap-lg px-lg py-md md:grid-cols-[minmax(0,1fr)_16rem]">
        <Facts rows={facts} />
        {row.receipt_url ? (
          <a href={row.receipt_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl">
            <img
              src={row.receipt_url}
              alt={`Receipt from ${row.sender_name}`}
              className="max-h-96 w-full rounded-xl bg-surface-container-high object-contain"
            />
            <span className="mt-xs block text-xs text-on-surface-variant underline underline-offset-4">
              Open full size (link lasts ten minutes)
            </span>
          </a>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl bg-surface-container-high p-md text-center text-xs text-on-surface-variant">
            {row.receipt_deleted_at ? `Receipt deleted ${day(row.receipt_deleted_at)}` : 'Receipt could not be loaded. Reload the list.'}
          </div>
        )}
      </div>

      {pending && (
        <div className="border-t border-outline-variant/40 bg-surface-container-low px-lg py-md">
          <Problem error={error} />
          <div className="flex flex-wrap items-end gap-sm">
            <label htmlFor={reasonId} className="flex min-w-0 flex-1 basis-64 flex-col gap-xs text-sm font-semibold text-on-surface">
              Reason, if rejecting
              <input
                id={reasonId}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="The member is emailed these words"
                className={input}
              />
            </label>
            <Button disabled={busy} onClick={() => void decide('approve')}>
              Approve
            </Button>
            <Button kind="danger" disabled={busy} onClick={() => void decide('reject')}>
              Reject
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

type Form = { enabled: boolean; bankName: string; accountName: string; accountNumber: string } & Record<PlanId, string>

const naira = (kobo: number | null) => (kobo == null ? '' : String(kobo / 100))

function Settings({ api }: { api: PageProps['api'] }) {
  const loaded = useLoad(() => api.get<TransferSettings>('transfer-settings'), 'transfer-settings')
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = loaded.data
    if (!s) return
    setForm({
      enabled: s.enabled,
      bankName: s.bank_name,
      accountName: s.account_name,
      accountNumber: s.account_number,
      monthly: naira(s.price_monthly),
      biannual: naira(s.price_biannual),
      annual: naira(s.price_annual),
    })
  }, [loaded.data])

  if (!form) return <Problem error={loaded.error} />
  const set = (patch: Partial<Form>) => (setForm({ ...form, ...patch }), setSaved(false))

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await api.post('transfer-settings', form)
      setSaved(true)
      loaded.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SectionTitle
        note={`What members see on the Pay by bank transfer form. A change applies to receipts sent after it.${
          loaded.data?.updated_by ? ` Last changed ${when(loaded.data.updated_at)} by ${loaded.data.updated_by}.` : ''
        }`}
      >
        Account and prices
      </SectionTitle>
      <Card>
        <Problem error={error} />
        <div className="grid gap-md md:grid-cols-3">
          <Field label="Bank">
            <input value={form.bankName} maxLength={80} onChange={(e) => set({ bankName: e.target.value })} className={input} />
          </Field>
          <Field label="Account name">
            <input value={form.accountName} maxLength={120} onChange={(e) => set({ accountName: e.target.value })} className={input} />
          </Field>
          <Field label="Account number">
            <input
              value={form.accountNumber}
              inputMode="numeric"
              maxLength={20}
              onChange={(e) => set({ accountNumber: e.target.value.replace(/\D/g, '') })}
              className={input}
            />
          </Field>
          {PLAN_IDS.map((id) => (
            <Field key={id} label={`${PLANS[id].label} price (₦)`}>
              <input
                value={form[id]}
                inputMode="decimal"
                onChange={(e) => set({ [id]: e.target.value.replace(/[^\d.]/g, '') } as Partial<Form>)}
                className={input}
              />
            </Field>
          ))}
        </div>
        <p className="mt-sm text-xs text-on-surface-variant">
          Prices are in naira. Leave one empty to not offer that plan by transfer.
        </p>
        <div className="mt-lg flex flex-wrap items-center justify-between gap-md border-t border-outline-variant/40 pt-md">
          <label className="flex items-center gap-sm text-sm font-semibold">
            <input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} className={checkbox} />
            Offer bank transfer in the app
          </label>
          <div className="flex items-center gap-sm">
            <span role="status" className="text-sm text-on-surface-variant">
              {saved ? 'Saved.' : ''}
            </span>
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * The promotion
 * ------------------------------------------------------------------ */

/** `YYYY-MM-DDTHH:mm` in this browser's time, for a datetime-local input. */
function localInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type PromoForm = { name: string; percent: string; plans: PlanId[]; starts: string; ends: string }

function blankPromo(): PromoForm {
  const now = new Date()
  const week = new Date(now.getTime() + 7 * 86_400_000)
  week.setHours(23, 59, 0, 0)
  return { name: '', percent: '', plans: [...PLAN_IDS], starts: localInput(now), ends: localInput(week) }
}

/**
 * A percentage off the bank-transfer prices, between two times. The app
 * shows it on Become a member and on the transfer form, with the full
 * price struck through, and the server prices each receipt by it. Card
 * prices are Paystack's and do not change.
 */
function PromoSettings({ api }: { api: PageProps['api'] }) {
  const loaded = useLoad(() => api.get<TransferSettings>('transfer-settings'), 'transfer-settings:promo')
  const [form, setForm] = useState<PromoForm>(blankPromo)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const s = loaded.data
  const current =
    s?.promo_percent && s.promo_name && s.promo_starts_at && s.promo_ends_at
      ? {
          name: s.promo_name,
          percent: s.promo_percent,
          plans: s.promo_plans ?? [],
          starts: new Date(s.promo_starts_at),
          ends: new Date(s.promo_ends_at),
        }
      : null

  useEffect(() => {
    if (!current) return
    setForm({
      name: current.name,
      percent: String(current.percent),
      plans: current.plans,
      starts: localInput(current.starts),
      ends: localInput(current.ends),
    })
    // Fill the form from what is saved, each time it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded.data])

  const set = (patch: Partial<PromoForm>) => (setForm({ ...form, ...patch }), setNote(''))
  const percent = Number(form.percent)
  const validPercent = Number.isInteger(percent) && percent >= 1 && percent <= PROMO_MAX_PERCENT

  const now = Date.now()
  const state = !current
    ? null
    : now < current.starts.getTime()
      ? ({ label: 'Scheduled', tone: 'warn' } as const)
      : now < current.ends.getTime()
        ? ({ label: 'Running', tone: 'good' } as const)
        : ({ label: 'Ended', tone: 'plain' } as const)

  async function save() {
    if (!form.starts || !form.ends) return setError('Set when it starts and ends.')
    setBusy(true)
    setError(null)
    try {
      await api.post('promo', {
        name: form.name,
        percent,
        plans: form.plans,
        startsISO: new Date(form.starts).toISOString(),
        endsISO: new Date(form.ends).toISOString(),
      })
      setNote('Saved. The app shows it from the start time.')
      loaded.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function end() {
    if (!confirm('End the promotion now? Transfer prices go back to normal at once.')) return
    setBusy(true)
    setError(null)
    try {
      await api.post('promo', { clear: true })
      setForm(blankPromo())
      setNote('Ended. Prices are back to normal.')
      loaded.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const listed: Record<PlanId, number | null | undefined> = {
    monthly: s?.price_monthly,
    biannual: s?.price_biannual,
    annual: s?.price_annual,
  }
  const priced = PLAN_IDS.flatMap((id) => (listed[id] ? [{ id, full: Number(listed[id]) }] : []))

  return (
    <>
      <SectionTitle note="A percentage off the bank-transfer prices, for a set time. Members see it on Become a member and on the transfer form, with the old price crossed out. Card prices are set in Paystack and stay the same.">
        Promotion
      </SectionTitle>
      <Card>
        {current && state && (
          <div className="mb-md flex flex-wrap items-center gap-sm rounded-xl bg-surface-container p-md text-sm">
            <Pill tone={state.tone}>{state.label}</Pill>
            <span className="font-semibold text-on-surface">
              {current.name}: {current.percent}% off {current.plans.map((p) => PLANS[p].label).join(', ')}
            </span>
            <span className="text-on-surface-variant">
              {when(current.starts.toISOString())} to {when(current.ends.toISOString())}
            </span>
          </div>
        )}
        <Problem error={error} />
        <div className="grid gap-md md:grid-cols-2">
          <Field label="Name members see">
            <input
              value={form.name}
              maxLength={60}
              placeholder="Black Friday"
              onChange={(e) => set({ name: e.target.value })}
              className={input}
            />
          </Field>
          <Field label="Discount (%)">
            <input
              value={form.percent}
              inputMode="numeric"
              maxLength={2}
              placeholder="20"
              onChange={(e) => set({ percent: e.target.value.replace(/\D/g, '') })}
              className={input}
            />
          </Field>
          <Field label="Starts">
            <input type="datetime-local" value={form.starts} onChange={(e) => set({ starts: e.target.value })} className={input} />
          </Field>
          <Field label="Ends">
            <input type="datetime-local" value={form.ends} onChange={(e) => set({ ends: e.target.value })} className={input} />
          </Field>
        </div>

        <fieldset className="mt-md">
          <legend className="mb-xs text-sm font-semibold text-on-surface">Plans it applies to</legend>
          <div className="flex flex-wrap gap-md">
            {PLAN_IDS.map((id) => (
              <label key={id} className="flex items-center gap-sm text-sm">
                <input
                  type="checkbox"
                  className={checkbox}
                  checked={form.plans.includes(id)}
                  onChange={(e) =>
                    set({ plans: e.target.checked ? [...form.plans, id] : form.plans.filter((p) => p !== id) })
                  }
                />
                {PLANS[id].label}
              </label>
            ))}
          </div>
        </fieldset>

        {validPercent && priced.length > 0 && s && (
          <div className="mt-md rounded-xl bg-surface-container-low p-md text-sm">
            <p className="mb-xs font-semibold text-on-surface">Members will pay by transfer</p>
            <ul className="space-y-0.5">
              {priced.map(({ id, full }) => (
                <li key={id} className="text-on-surface">
                  {PLANS[id].label}:{' '}
                  {form.plans.includes(id) ? (
                    <>
                      <s className="text-on-surface-variant">{formatAmount(full, s.currency)}</s>{' '}
                      <strong>{formatAmount(promoPrice(full, percent), s.currency)}</strong>
                    </>
                  ) : (
                    <span>{formatAmount(full, s.currency)} (no discount)</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-xs text-xs text-on-surface-variant">Rounded to the nearest naira.</p>
          </div>
        )}

        <div className="mt-lg flex flex-wrap items-center justify-end gap-sm border-t border-outline-variant/40 pt-md">
          <span role="status" className="mr-auto text-sm text-on-surface-variant">
            {note}
          </span>
          {current && (
            <Button kind="danger" disabled={busy} onClick={() => void end()}>
              End promotion
            </Button>
          )}
          <Button disabled={busy || !validPercent || !form.name.trim() || form.plans.length === 0} onClick={() => void save()}>
            {busy ? 'Saving…' : current ? 'Save changes' : 'Start promotion'}
          </Button>
        </div>
      </Card>
    </>
  )
}
