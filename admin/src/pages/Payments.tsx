import { useState } from 'react'
import type { PageProps } from '../App'
import { when, type PaymentRow } from '../api'
import { Button, Icon, ListState, PageHeader, Panel, Pill, Problem, input } from '../ui'
import { useLoad } from './useLoad'

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount / 100)

/** Successful Paystack charges (from the webhook, with any refund or chargeback reported since) and approved bank transfers. */
export default function Payments({ api }: PageProps) {
  const [email, setEmail] = useState('')
  const [filter, setFilter] = useState('')
  const { data, error } = useLoad(
    () => api.get<PaymentRow[]>('payments', { email: filter }),
    `payments:${filter}`,
  )
  const totals = new Map<string, number>()
  for (const p of data ?? []) totals.set(p.currency, (totals.get(p.currency) ?? 0) + p.amount)

  return (
    <>
      <PageHeader
        title="Payments"
        lede={
          data
            ? `${data.length} ${data.length === 1 ? 'payment' : 'payments'}${[...totals]
                .map(([currency, amount]) => ` · ${money(amount, currency)}`)
                .join('')} (latest 500).`
            : undefined
        }
      >
        <form
          role="search"
          className="flex items-center gap-sm"
          onSubmit={(e) => {
            e.preventDefault()
            setFilter(email.trim())
          }}
        >
          <span className="relative block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Filter payments by email"
              placeholder="Filter by email"
              className={`${input} w-56 !pl-9 sm:w-64`}
            />
          </span>
          <Button type="submit" kind="quiet">
            Filter
          </Button>
        </form>
      </PageHeader>
      <Problem error={error} />

      <ListState data={data} error={error} empty={filter ? 'No payments from that address.' : 'No payments yet.'} />
      {data && data.length > 0 && (
        <Panel className="!overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-on-surface-variant">
              <tr>
                <th scope="col" className="px-lg py-sm font-semibold">Paid</th>
                <th scope="col" className="px-md py-sm font-semibold">Email</th>
                <th scope="col" className="px-md py-sm text-right font-semibold">Amount</th>
                <th scope="col" className="px-md py-sm font-semibold">How</th>
                <th scope="col" className="px-lg py-sm font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 border-t border-outline-variant/40">
              {data.map((p) => (
                <tr key={p.reference} className="hover:bg-surface-container-low">
                  <td className="whitespace-nowrap px-lg py-sm text-on-surface-variant">{when(p.paid_at)}</td>
                  <td className="px-md py-sm font-semibold">{p.email}</td>
                  <td className="whitespace-nowrap px-md py-sm text-right font-bold">
                    {p.reversal && (
                      <span className="mr-sm">
                        <Pill tone="bad">
                          {p.reversal === 'refund' ? 'Refunded' : 'Charged back'}
                          {p.reversed_amount != null && p.reversed_amount < p.amount
                            ? ` ${money(p.reversed_amount, p.currency)}`
                            : ''}
                        </Pill>
                      </span>
                    )}
                    {money(p.amount, p.currency)}
                  </td>
                  <td className="whitespace-nowrap px-md py-sm">{p.method === 'transfer' ? 'Bank transfer' : 'Card'}</td>
                  <td className="px-lg py-sm font-mono text-xs text-on-surface-variant">{p.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <p className="mt-lg max-w-2xl text-sm text-on-surface-variant [text-wrap:pretty]">
        Bank transfers appear here once approved under Bank transfers. Card refunds and disputes are
        made in the Paystack dashboard. A full refund or a lost chargeback on a member&rsquo;s latest
        payment ends their access; anything else leaves a note on the member.
      </p>
    </>
  )
}
