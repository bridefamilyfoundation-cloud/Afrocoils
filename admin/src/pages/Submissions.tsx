import { useState } from 'react'
import type { PageProps } from '../App'
import { when, type SubmissionRow } from '../api'
import { Button, Card, Facts, Field, ListState, PageHeader, Pill, Problem, Segmented, input } from '../ui'
import { useLoad } from './useLoad'

const REVIEWS = ['Pending', 'Approved', 'Rejected'] as const
const REVIEW_OPTIONS = REVIEWS.map((r) => ({ value: r, label: r }))

/**
 * The community style queue. Approving here records the decision; it
 * does not publish anything — a library entry is still written up by
 * hand in src/content/styles.ts, with steps, and shipped as an update.
 * Photos are signed links that last an hour; the bucket stays private.
 */
export default function Submissions({ api, recount }: PageProps) {
  const [review, setReview] = useState<(typeof REVIEWS)[number]>('Pending')
  const list = useLoad(() => api.get<SubmissionRow[]>('submissions', { review }), `submissions:${review}`)
  const changed = () => {
    list.reload()
    recount()
  }

  return (
    <>
      <PageHeader
        title="Style submissions"
        lede="Approving records the decision only. A style reaches the app when it is written up, with steps, in the style library and shipped in an update."
      >
        <Segmented label="Review status" options={REVIEW_OPTIONS} value={review} onChange={setReview} />
      </PageHeader>
      <Problem error={list.error} />
      <ListState data={list.data} error={list.error} empty={`Nothing ${review.toLowerCase()}.`} />
      <div className="space-y-lg">
        {list.data?.map((s) => (
          <Submission key={s.id} api={api} row={s} onChange={changed} />
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
    <Card className="overflow-hidden !p-0">
      <div className="flex flex-wrap items-center justify-between gap-sm px-lg pt-lg">
        <h2 className="min-w-0 break-words text-lg font-bold text-on-surface">{field(b, 'name') ?? '(no name)'}</h2>
        <span className="flex items-center gap-sm text-xs text-on-surface-variant">
          Received {when(row.received_at)}
          <Pill tone={row.review === 'Approved' ? 'good' : row.review === 'Rejected' ? 'bad' : 'warn'}>{row.review}</Pill>
        </span>
      </div>

      <div className="px-lg py-md">
        <Problem error={error} />
        {row.photos.length > 0 && (
          <div className="mb-md grid grid-cols-2 gap-sm sm:grid-cols-4">
            {row.photos.map((url, i) =>
              url ? (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-xl">
                  <img
                    src={url}
                    alt={`Photo ${i + 1} of ${row.photos.length}, opens full size`}
                    className="aspect-[4/5] w-full rounded-xl bg-surface-container-high object-cover"
                  />
                </a>
              ) : (
                <div
                  key={i}
                  className="flex aspect-[4/5] items-center justify-center rounded-xl bg-surface-container-high p-sm text-center text-xs text-on-surface-variant"
                >
                  Photo not available
                </div>
              ),
            )}
          </div>
        )}
        <Facts
          rows={Object.keys(b)
            .filter((k) => k !== 'name')
            .map((k) => [k, field(b, k)] as const)}
        />
        {row.reviewer_note && (
          <p className="mt-md rounded-xl bg-surface-container-low px-md py-sm text-sm text-on-surface-variant">
            Reviewer note: {row.reviewer_note}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-sm border-t border-outline-variant/40 bg-surface-container-low px-lg py-md">
        <Field label="Note (optional)" className="flex-1 basis-64">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        </Field>
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
