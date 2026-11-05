import { useState } from 'react'
import { membershipOpen } from '../../../src/lib/types'
import type { PageProps } from '../App'
import { day, when, type MemberRow } from '../api'
import { Button, Card, Pill, Problem, input } from '../ui'
import { useLoad } from './useLoad'

/**
 * Members, by email. Grant adds months on top of whatever is already
 * paid (a bank transfer, a refund made good, a gift). Revoke ends access
 * at the phone's next check and stops the Paystack subscription, so the
 * card is not charged again.
 */
export default function Members({ api }: PageProps) {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const { data, error, reload, setError } = useLoad(
    () => api.get<MemberRow[]>('members', { q: search }),
    `members:${search}`,
  )
  const [newEmail, setNewEmail] = useState('')
  const [months, setMonths] = useState('1')
  const [busy, setBusy] = useState(false)

  async function act(body: Record<string, unknown>, confirmText?: string): Promise<boolean> {
    if (confirmText && !confirm(confirmText)) return false
    setBusy(true)
    try {
      await api.post('members', body)
      reload()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="mb-lg text-2xl font-bold text-primary">Members</h1>
      <Problem error={error} />

      <Card className="mb-lg">
        <h2 className="mb-sm font-bold">Give someone access</h2>
        <form
          className="flex flex-wrap items-center gap-sm"
          onSubmit={(e) => {
            e.preventDefault()
            void act({ email: newEmail, action: 'grant', months: Number(months) }).then(
              (ok) => ok && setNewEmail(''),
            )
          }}
        >
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email"
            className={`${input} flex-1`}
          />
          <select value={months} onChange={(e) => setMonths(e.target.value)} className={input}>
            {[1, 2, 3, 6, 12].map((n) => (
              <option key={n} value={n}>
                {n} month{n === 1 ? '' : 's'}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={busy}>
            Grant
          </Button>
        </form>
        <p className="mt-sm text-xs text-on-surface-variant">
          They sign in on the phone with this email. Months are added after any time already paid.
        </p>
      </Card>

      <form
        className="mb-md flex gap-sm"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(q.trim())
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email"
          className={`${input} flex-1`}
        />
        <Button type="submit" kind="quiet">
          Search
        </Button>
      </form>

      <div className="space-y-sm">
        {data?.length === 0 && (
          <p className="text-sm text-on-surface-variant">No members{search ? ' match' : ' yet'}.</p>
        )}
        {data?.map((m) => {
          const open = membershipOpen(m.paid_until)
          return (
            <Card key={m.email} className="!p-md">
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold">{m.email}</p>
                  <p className="text-xs text-on-surface-variant">
                    Paid until {day(m.paid_until)} · {m.source} · last seen {when(m.last_seen_at)}
                  </p>
                </div>
                <div className="flex items-center gap-xs">
                  <Pill tone={open ? 'good' : 'bad'}>{open ? 'Has access' : 'Locked'}</Pill>
                  <Pill tone={m.status === 'attention' ? 'warn' : 'plain'}>{m.status}</Pill>
                </div>
              </div>
              {m.note && (
                <pre className="mt-sm whitespace-pre-wrap font-sans text-xs text-on-surface-variant">
                  {m.note}
                </pre>
              )}
              <div className="mt-sm flex flex-wrap gap-xs">
                <Button
                  kind="quiet"
                  disabled={busy}
                  onClick={() => void act({ email: m.email, action: 'grant', months: 1 })}
                >
                  +1 month
                </Button>
                {open && (
                  <Button
                    kind="danger"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        { email: m.email, action: 'revoke' },
                        `Revoke ${m.email}? Access ends at their next check${
                          m.paystack_subscription ? ' and the Paystack subscription is cancelled' : ''
                        }.`,
                      )
                    }
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
