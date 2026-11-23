import type { PageName, PageProps } from '../App'
import type { Overview } from '../api'
import { Icon, PageHeader, Panel, Problem, type IconName } from '../ui'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * The queues, in the order a person should clear them: money a member
 * is waiting on, then mail, then the two that feed the app's content.
 * A queue with nothing in it stays on the list, quietly, so "clear" is
 * something you can see rather than infer from a missing row.
 */
const QUEUES: {
  page: PageName
  icon: IconName
  label: string
  count: (o: Overview) => number
  waiting: (o: Overview) => string
  clear: string
}[] = [
  {
    page: 'transfers',
    icon: 'transfers',
    label: 'Bank transfers',
    count: (o) => o.transfers,
    waiting: (o) => `${plural(o.transfers, 'receipt', 'receipts')} to check against the statement`,
    clear: 'No receipts waiting',
  },
  {
    page: 'inbox',
    icon: 'mail',
    label: 'Mail',
    count: (o) => o.unread,
    waiting: (o) => `${o.unread} unread · ${plural(o.open, 'open conversation', 'open conversations')}`,
    clear: 'Nothing unread',
  },
  {
    page: 'submissions',
    icon: 'submissions',
    label: 'Style submissions',
    count: (o) => o.pending,
    waiting: (o) => `${plural(o.pending, 'style', 'styles')} waiting for review`,
    clear: 'No styles waiting',
  },
  {
    page: 'questions',
    icon: 'questions',
    label: 'Ask questions',
    count: (o) => o.unanswered,
    waiting: (o) => `${plural(o.unanswered, 'question', 'questions')} Ask could not answer`,
    clear: 'No unanswered questions',
  },
]

export default function Dashboard({ overview }: PageProps) {
  const { data, error } = overview
  const busy = data ? QUEUES.filter((q) => q.count(data) > 0).length : 0

  return (
    <>
      <PageHeader
        title="Overview"
        lede={
          !data
            ? error
              ? undefined
              : 'Counting what is waiting…'
            : busy === 0
              ? 'Every queue is clear.'
              : `${plural(busy, 'queue has', 'queues have')} something waiting for a person.`
        }
      />
      <Problem error={error} />

      <div className="grid items-start gap-lg lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel>
          {QUEUES.map((queue) => {
            const count = data ? queue.count(data) : undefined
            const waiting = count !== undefined && count > 0
            return (
              <a
                key={queue.page}
                href={`#/${queue.page}`}
                className="group flex items-center gap-md px-lg py-md transition-colors hover:bg-surface-container-low"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    waiting ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <Icon name={waiting || count === undefined ? queue.icon : 'check'} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-on-surface">{queue.label}</span>
                  <span className="block text-sm text-on-surface-variant">
                    {data ? (waiting ? queue.waiting(data) : queue.clear) : '…'}
                  </span>
                </span>
                {waiting && <span className="text-2xl font-bold text-primary">{count}</span>}
                <Icon name="chevron" className="h-5 w-5 text-outline transition-transform group-hover:translate-x-0.5" />
              </a>
            )
          })}
        </Panel>

        <Panel>
          <a href="#/members" className="group block px-lg py-md transition-colors hover:bg-surface-container-low">
            <span className="flex items-center justify-between gap-sm">
              <span className="font-bold text-on-surface">Members</span>
              <Icon name="chevron" className="h-5 w-5 text-outline transition-transform group-hover:translate-x-0.5" />
            </span>
            <dl className="mt-sm space-y-xs text-sm">
              <div className="flex items-baseline justify-between gap-md">
                <dt className="text-on-surface-variant">With access now</dt>
                <dd className="text-lg font-bold text-primary">{data?.paying ?? '…'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-md">
                <dt className="text-on-surface-variant">Ever joined</dt>
                <dd className="text-lg font-bold text-primary">{data?.members ?? '…'}</dd>
              </div>
            </dl>
          </a>
        </Panel>
      </div>
    </>
  )
}
