import { useState } from 'react'
import { PLANS, accessOpen, trialOpen } from '../../../src/lib/types'
import type { PageProps } from '../App'
import { day, when, type MemberRow } from '../api'
import { Button, Card, Field, Icon, ListState, PageHeader, Panel, Pill, Problem, SectionTitle, input } from '../ui'
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
      <PageHeader
        title="Members"
        lede={
          data
            ? `${data.length} ${data.length === 1 ? 'member' : 'members'}${search ? ` matching “${search}”` : ''}.`
            : undefined
        }
      >
        <form
          role="search"
          className="flex items-center gap-sm"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(q.trim())
          }}
        >
          <span className="relative block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search members by email"
              placeholder="Search by email"
              className={`${input} w-56 !pl-9 sm:w-64`}
            />
          </span>
          <Button type="submit" kind="quiet">
            Search
          </Button>
        </form>
      </PageHeader>
      <Problem error={error} />

      <ListState data={data} error={error} empty={search ? 'No members match.' : 'No members yet.'} />
      {data && data.length > 0 && (
        <Panel>
          {data.map((m) => {
            const open = accessOpen({ paidUntilISO: m.paid_until, trialEndsISO: m.trial_ends_at })
            const trialing = trialOpen(m.trial_ends_at)
            return (
              <div key={m.email} className="px-lg py-md">
                <div className="flex flex-wrap items-start justify-between gap-x-md gap-y-sm">
                  <div className="min-w-0 flex-1 basis-72">
                    <p className="flex flex-wrap items-center gap-x-sm gap-y-xs">
                      <span className="min-w-0 break-all font-bold text-on-surface">{m.email}</span>
                      <Pill tone={open ? 'good' : 'bad'}>{open ? 'Has access' : 'Locked'}</Pill>
                      <Pill tone={m.status === 'attention' ? 'warn' : 'plain'}>{m.status}</Pill>
                    </p>
                    <p className="mt-xs text-sm text-on-surface">
                      {m.plan ? PLANS[m.plan].label : 'No plan'} · paid until {day(m.paid_until)}
                      {m.trial_ends_at ? ` · trial ${trialing ? 'ends' : 'ended'} ${day(m.trial_ends_at)}` : ''}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {m.source} · last seen {when(m.last_seen_at)}
                      {m.last_notice ? ` · last reminder ${m.last_notice}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-xs">
                    <Button
                      kind="quiet"
                      size="sm"
                      disabled={busy}
                      onClick={() => void act({ email: m.email, action: 'grant', months: 1 })}
                    >
                      <Icon name="plus" className="h-3.5 w-3.5" />1 month
                    </Button>
                    {open && (
                      <Button
                        kind="danger"
                        size="sm"
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
                </div>
                {m.note && (
                  <pre className="mt-sm whitespace-pre-wrap rounded-xl bg-surface-container-low px-md py-sm font-sans text-xs text-on-surface-variant">
                    {m.note}
                  </pre>
                )}
              </div>
            )
          })}
        </Panel>
      )}

      <SectionTitle note="They sign in on the phone with this email. Months are added after any time already paid.">
        Give someone access
      </SectionTitle>
      <Card>
        <form
          className="flex flex-wrap items-end gap-md"
          onSubmit={(e) => {
            e.preventDefault()
            void act({ email: newEmail, action: 'grant', months: Number(months) }).then((ok) => ok && setNewEmail(''))
          }}
        >
          <Field label="Email" className="flex-1 basis-64">
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="name@example.com"
              className={input}
            />
          </Field>
          <Field label="For">
            <select value={months} onChange={(e) => setMonths(e.target.value)} className={input}>
              {[1, 2, 3, 6, 12].map((n) => (
                <option key={n} value={n}>
                  {n} month{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={busy}>
            Grant access
          </Button>
        </form>
      </Card>
    </>
  )
}
