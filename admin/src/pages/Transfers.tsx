import { useEffect, useState } from 'react'
import type { PageProps } from '../App'
import { day, when, type TransferRow, type TransferSettings } from '../api'
import { PLANS, PLAN_IDS, TRANSFER_STATUSES, formatAmount, type PlanId, type TransferStatus } from '../../../src/lib/types'
import { Button, Card, Pill, Problem, input } from '../ui'
import { useLoad } from './useLoad'

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
export default function Transfers({ api }: PageProps) {
  const [status, setStatus] = useState<TransferStatus>('Pending')
  const list = useLoad(() => api.get<TransferRow[]>('transfers', { status }), `transfers:${status}`)

  return (
    <>
      <div className="mb-lg flex flex-wrap items-center justify-between gap-sm">
        <h1 className="text-2xl font-bold text-primary">Bank transfers</h1>
        <div className="flex gap-xs">
          {TRANSFER_STATUSES.map((s) => (
            <Button key={s} kind={s === status ? 'primary' : 'quiet'} onClick={() => setStatus(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>
      <p className="mb-md text-sm text-on-surface-variant">
        Match every receipt to a credit on the bank statement before approving: a screenshot can be
        edited. Approving opens the plan and emails the member; rejecting emails them your reason.
      </p>
      <Problem error={list.error} />
      <div className="mb-xl space-y-md">
        {list.data?.length === 0 && <p className="text-sm text-on-surface-variant">Nothing {status.toLowerCase()}.</p>}
        {list.data?.map((t) => (
          <Transfer key={t.id} api={api} row={t} onChange={list.reload} />
        ))}
      </div>
      <Settings api={api} />
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
    ['Name on sending account', row.sender_name],
    ['Day paid', day(`${row.paid_on}T12:00:00Z`)],
    ['Bank reference', row.bank_reference ?? '—'],
    ['Paid up until now', day(row.member_paid_until)],
    ['Receipt fingerprint', row.receipt_sha256.slice(0, 16)],
  ]

  return (
    <Card>
      <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-lg font-bold">
          {formatAmount(row.amount, row.currency)} · {row.sender_name}
        </h2>
        <span className="text-xs text-on-surface-variant">
          sent {when(row.submitted_at)} ·{' '}
          <Pill tone={row.status === 'Approved' ? 'good' : row.status === 'Rejected' ? 'bad' : 'warn'}>{row.status}</Pill>
        </span>
      </div>
      <Problem error={error} />
      <div className="grid gap-md md:grid-cols-[1fr_16rem]">
        <dl className="grid content-start gap-xs text-sm md:grid-cols-[12rem_1fr]">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold text-on-surface-variant">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
          {!pending && (
            <div className="contents">
              <dt className="font-semibold text-on-surface-variant">Decided</dt>
              <dd>
                {when(row.reviewed_at)} by {row.reviewed_by}
                {row.reviewer_note ? ` — ${row.reviewer_note}` : ''}
              </dd>
            </div>
          )}
        </dl>
        {row.receipt_url ? (
          <a href={row.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={row.receipt_url}
              alt={`Receipt from ${row.sender_name}`}
              className="max-h-96 w-full rounded-xl bg-surface-container-high object-contain"
            />
            <span className="mt-xs block text-xs text-on-surface-variant">Open full size (link lasts ten minutes)</span>
          </a>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl bg-surface-container-high p-md text-center text-xs text-on-surface-variant">
            {row.receipt_deleted_at ? `Receipt deleted ${day(row.receipt_deleted_at)}` : 'Receipt could not be loaded. Reload the list.'}
          </div>
        )}
      </div>
      {pending && (
        <div className="mt-md flex flex-wrap items-center gap-xs">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="Reason (required to reject; the member is emailed it)"
            className={`${input} min-w-64 flex-1`}
          />
          <Button disabled={busy} onClick={() => void decide('approve')}>
            Approve
          </Button>
          <Button kind="danger" disabled={busy} onClick={() => void decide('reject')}>
            Reject
          </Button>
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
    <Card>
      <h2 className="mb-xs text-lg font-bold">Account and prices</h2>
      <p className="mb-md text-sm text-on-surface-variant">
        What members see on the Pay by bank transfer form. Prices are in naira; leave one empty to
        not offer that plan by transfer. A change applies to receipts sent after it.
        {loaded.data?.updated_by ? ` Last changed ${when(loaded.data.updated_at)} by ${loaded.data.updated_by}.` : ''}
      </p>
      <Problem error={error} />
      <div className="grid gap-sm md:grid-cols-3">
        <label className="flex flex-col gap-xs text-sm">
          Bank
          <input value={form.bankName} maxLength={80} onChange={(e) => set({ bankName: e.target.value })} className={input} />
        </label>
        <label className="flex flex-col gap-xs text-sm">
          Account name
          <input value={form.accountName} maxLength={120} onChange={(e) => set({ accountName: e.target.value })} className={input} />
        </label>
        <label className="flex flex-col gap-xs text-sm">
          Account number
          <input
            value={form.accountNumber}
            inputMode="numeric"
            maxLength={20}
            onChange={(e) => set({ accountNumber: e.target.value.replace(/\D/g, '') })}
            className={input}
          />
        </label>
        {PLAN_IDS.map((id) => (
          <label key={id} className="flex flex-col gap-xs text-sm">
            {PLANS[id].label} price (₦)
            <input
              value={form[id]}
              inputMode="decimal"
              onChange={(e) => set({ [id]: e.target.value.replace(/[^\d.]/g, '') } as Partial<Form>)}
              className={input}
            />
          </label>
        ))}
      </div>
      <label className="mt-md flex items-center gap-sm text-sm font-semibold">
        <input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        Offer bank transfer in the app
      </label>
      <div className="mt-md flex items-center gap-sm">
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        {saved && <span className="text-sm text-on-surface-variant">Saved.</span>}
      </div>
    </Card>
  )
}
