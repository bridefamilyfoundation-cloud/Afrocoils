import { useState } from 'react'
import type { PageProps } from '../App'
import { when, type PaymentRow } from '../api'
import { Button, Card, Problem, input } from '../ui'
import { useLoad } from './useLoad'

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount / 100)

/** Successful Paystack charges, from the webhook. Refunds are made in the Paystack dashboard. */
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
      <h1 className="mb-lg text-2xl font-bold text-primary">Payments</h1>
      <Problem error={error} />
      <form
        className="mb-md flex gap-sm"
        onSubmit={(e) => {
          e.preventDefault()
          setFilter(email.trim())
        }}
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Filter by email"
          className={`${input} flex-1`}
        />
        <Button type="submit" kind="quiet">
          Filter
        </Button>
      </form>
      <p className="mb-md text-sm text-on-surface-variant">
        {data?.length ?? '…'} payments
        {[...totals].map(([currency, amount]) => ` · ${money(amount, currency)}`)} (latest 500).
        Refunds and disputes are handled in the Paystack dashboard.
      </p>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-high text-xs uppercase text-on-surface-variant">
            <tr>
              <th className="p-sm">Paid</th>
              <th className="p-sm">Email</th>
              <th className="p-sm">Amount</th>
              <th className="p-sm">Reference</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.reference} className="border-t border-outline-variant/40">
                <td className="whitespace-nowrap p-sm">{when(p.paid_at)}</td>
                <td className="p-sm">{p.email}</td>
                <td className="whitespace-nowrap p-sm">{money(p.amount, p.currency)}</td>
                <td className="p-sm font-mono text-xs">{p.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
