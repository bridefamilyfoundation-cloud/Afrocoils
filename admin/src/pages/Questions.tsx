import { useState } from 'react'
import { ASK_OUTCOMES } from '../../../src/lib/types'
import type { PageProps } from '../App'
import { when, type QuestionRow } from '../api'
import { Button, Card, Pill, Problem, input } from '../ui'
import { useLoad } from './useLoad'

/**
 * The anonymous Ask log: the words typed, what Ask did with them, the
 * record it matched. No profile, no device, no person. `none` is the
 * backlog — questions Ask could not answer, which become answers.ts
 * entries. `npm run ask:study` is still the full report; this is for
 * reading and ticking off.
 */
export default function Questions({ api }: PageProps) {
  const [outcome, setOutcome] = useState('none')
  const [reviewed, setReviewed] = useState('false')
  const list = useLoad(
    () => api.get<QuestionRow[]>('questions', { outcome, reviewed }),
    `questions:${outcome}:${reviewed}`,
  )
  const [busy, setBusy] = useState(false)

  async function mark(ids: number[], value: boolean) {
    if (ids.length === 0) return
    setBusy(true)
    try {
      await api.post('questions', { ids, reviewed: value })
      list.reload()
    } catch (e) {
      list.setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="mb-lg text-2xl font-bold text-primary">Ask questions</h1>
      <div className="mb-md flex flex-wrap gap-sm">
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={input}>
          <option value="">Every outcome</option>
          {ASK_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o === 'none' ? 'none (unanswered)' : o}
            </option>
          ))}
        </select>
        <select value={reviewed} onChange={(e) => setReviewed(e.target.value)} className={input}>
          <option value="false">Not reviewed</option>
          <option value="true">Reviewed</option>
          <option value="">Both</option>
        </select>
        <Button
          kind="quiet"
          disabled={busy || !list.data?.some((q) => !q.reviewed)}
          onClick={() => void mark((list.data ?? []).filter((q) => !q.reviewed).map((q) => q.id), true)}
        >
          Mark all shown as reviewed
        </Button>
      </div>
      <Problem error={list.error} />
      <p className="mb-md text-sm text-on-surface-variant">{list.data?.length ?? '…'} questions (latest 500)</p>
      <div className="space-y-xs">
        {list.data?.map((q) => (
          <Card key={q.id} className="flex items-center justify-between gap-md !p-md">
            <div className="min-w-0">
              <p className="text-sm">{q.question}</p>
              <p className="text-xs text-on-surface-variant">
                {when(q.asked_at)} · <Pill tone={q.outcome === 'none' ? 'warn' : 'plain'}>{q.outcome}</Pill>
                {q.matched && ` · ${q.matched}`}
                {q.bundle !== null && ` · update ${q.bundle}`}
              </p>
            </div>
            <Button kind="quiet" disabled={busy} onClick={() => void mark([q.id], !q.reviewed)}>
              {q.reviewed ? 'Unmark' : 'Reviewed'}
            </Button>
          </Card>
        ))}
      </div>
    </>
  )
}
