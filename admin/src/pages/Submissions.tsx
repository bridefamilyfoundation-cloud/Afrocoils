import { useState } from 'react'
import type { PageProps } from '../App'
import { when, type SubmissionRow } from '../api'
import { Button, Card, Pill, Problem, input } from '../ui'
import { useLoad } from './useLoad'

const REVIEWS = ['Pending', 'Approved', 'Rejected'] as const

/**
 * The community style queue. Approving here records the decision; it
 * does not publish anything — a library entry is still written up by
 * hand in src/content/styles.ts, with steps, and shipped as an update.
 * Photos are signed links that last an hour; the bucket stays private.
 */
export default function Submissions({ api }: PageProps) {
  const [review, setReview] = useState<(typeof REVIEWS)[number]>('Pending')
  const list = useLoad(() => api.get<SubmissionRow[]>('submissions', { review }), `submissions:${review}`)

  return (
    <>
      <div className="mb-lg flex flex-wrap items-center justify-between gap-sm">
        <h1 className="text-2xl font-bold text-primary">Style submissions</h1>
        <div className="flex gap-xs">
          {REVIEWS.map((r) => (
            <Button key={r} kind={r === review ? 'primary' : 'quiet'} onClick={() => setReview(r)}>
              {r}
            </Button>
          ))}
        </div>
      </div>
      <p className="mb-md text-sm text-on-surface-variant">
        Approving records the decision only. A style reaches the app when it is written up, with
        steps, in the style library and shipped in an update.
      </p>
      <Problem error={list.error} />
      <div className="space-y-md">
        {list.data?.length === 0 && <p className="text-sm text-on-surface-variant">Nothing {review.toLowerCase()}.</p>}
        {list.data?.map((s) => (
          <Submission key={s.id} api={api} row={s} onChange={list.reload} />
        ))}
      </div>
    </>
  )
}

function field(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return value === undefined ? undefined : String(value)
}

function Submission({ api, row, onChange }: { api: PageProps['api']; row: SubmissionRow; onChange: () => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const b = row.body

  async function decide(next: SubmissionRow['review']) {
    setBusy(true)
    setError(null)
    try {
      await api.post('submission', { id: row.id, review: next, note })
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-lg font-bold">{field(b, 'name') ?? '(no name)'}</h2>
        <span className="text-xs text-on-surface-variant">
          {when(row.received_at)} · <Pill>{row.review}</Pill>
        </span>
      </div>
      <Problem error={error} />
      <dl className="mb-md grid gap-xs text-sm md:grid-cols-[10rem_1fr]">
        {Object.keys(b)
          .filter((k) => k !== 'name')
          .map((k) => (
            <div key={k} className="contents">
              <dt className="font-semibold text-on-surface-variant">{k}</dt>
              <dd className="whitespace-pre-wrap">{field(b, k)}</dd>
            </div>
          ))}
      </dl>
      {row.photos.length > 0 && (
        <div className="mb-md grid grid-cols-2 gap-sm md:grid-cols-4">
          {row.photos.map((url, i) =>
            url ? (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`Photo ${i + 1}`} className="aspect-[4/5] w-full rounded-xl object-cover" />
              </a>
            ) : (
              <div key={i} className="aspect-[4/5] rounded-xl bg-surface-container-high" />
            ),
          )}
        </div>
      )}
      {row.reviewer_note && <p className="mb-sm text-xs text-on-surface-variant">Note: {row.reviewer_note}</p>}
      <div className="flex flex-wrap items-center gap-xs">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={`${input} flex-1`} />
        <Button disabled={busy} onClick={() => void decide('Approved')}>
          Approve
        </Button>
        <Button kind="danger" disabled={busy} onClick={() => void decide('Rejected')}>
          Reject
        </Button>
        {row.review !== 'Pending' && (
          <Button kind="quiet" disabled={busy} onClick={() => void decide('Pending')}>
            Back to pending
          </Button>
        )}
      </div>
    </Card>
  )
}
