import { useState } from 'react'
import { ASK_OUTCOMES } from '../../../src/lib/types'
import type { PageProps } from '../App'
import { when, type QuestionRow } from '../api'
import { Button, Icon, ListState, PageHeader, Panel, Pill, Problem, Segmented, input } from '../ui'
import { useLoad } from './useLoad'

const REVIEWED = [
  { value: 'false', label: 'To review' },
  { value: 'true', label: 'Reviewed' },
  { value: '', label: 'Both' },
] as const

/**
 * The anonymous Ask log: the words typed, what Ask did with them, the
 * record it matched. No profile, no device, no person. `none` is the
 * backlog — questions Ask could not answer, which become answers.ts
 * entries. `npm run ask:study` is still the full report; this is for
 * reading and ticking off.
 */
export default function Questions({ api, recount }: PageProps) {
  const [outcome, setOutcome] = useState('none')
  const [reviewed, setReviewed] = useState<(typeof REVIEWED)[number]['value']>('false')
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
      recount()
    } catch (e) {
      list.setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const unreviewed = (list.data ?? []).filter((q) => !q.reviewed)

  return (
    <>
      <PageHeader
        title="Ask questions"
        lede="The words people typed into Ask, with nothing about who typed them. An unanswered one is a missing written answer."
      >
        <Segmented label="Reviewed or not" options={REVIEWED} value={reviewed} onChange={setReviewed} />
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          aria-label="Outcome"
          className={`${input} !rounded-full !pr-10`}
        >
          <option value="">Every outcome</option>
          {ASK_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o === 'none' ? 'none (unanswered)' : o}
            </option>
          ))}
        </select>
      </PageHeader>
      <Problem error={list.error} />

      <div className="mb-sm flex min-h-8 flex-wrap items-center justify-between gap-sm">
        <p className="text-sm text-on-surface-variant">
          {list.data ? `${list.data.length} ${list.data.length === 1 ? 'question' : 'questions'} (latest 500)` : ''}
        </p>
        {unreviewed.length > 0 && (
          <Button kind="quiet" size="sm" disabled={busy} onClick={() => void mark(unreviewed.map((q) => q.id), true)}>
            <Icon name="check" className="h-3.5 w-3.5" />
            Mark all {unreviewed.length} as reviewed
          </Button>
        )}
      </div>

      <ListState data={list.data} error={list.error} empty="No questions here." />
      {list.data && list.data.length > 0 && (
        <Panel>
          {list.data.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-md px-lg py-sm">
              <div className="min-w-0">
                <p className={`break-words text-sm ${q.reviewed ? 'text-on-surface-variant' : 'font-semibold text-on-surface'}`}>
                  {q.question}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-sm gap-y-xs text-xs text-on-surface-variant">
                  <Pill tone={q.outcome === 'none' ? 'warn' : 'plain'}>{q.outcome}</Pill>
                  <span>
                    {when(q.asked_at)}
                    {q.matched && ` · ${q.matched}`}
                    {q.bundle !== null && ` · update ${q.bundle}`}
                  </span>
                </p>
              </div>
              <Button kind="quiet" size="sm" disabled={busy} onClick={() => void mark([q.id], !q.reviewed)}>
                {q.reviewed ? 'Unmark' : 'Reviewed'}
              </Button>
            </div>
          ))}
        </Panel>
      )}
    </>
  )
}
