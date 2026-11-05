import type { PageName, PageProps } from '../App'
import type { Overview } from '../api'
import { Card, Problem } from '../ui'
import { useLoad } from './useLoad'

export default function Dashboard({ api, go }: PageProps) {
  const { data, error } = useLoad(() => api.get<Overview>('overview'), 'overview')
  const tiles: { label: string; value?: number; page: PageName }[] = [
    { label: 'Members with access', value: data?.paying, page: 'members' },
    { label: 'Members ever', value: data?.members, page: 'members' },
    { label: 'Unread mail', value: data?.unread, page: 'inbox' },
    { label: 'Open conversations', value: data?.open, page: 'inbox' },
    { label: 'Styles waiting for review', value: data?.pending, page: 'submissions' },
    { label: 'Unanswered Ask questions', value: data?.unanswered, page: 'questions' },
  ]
  return (
    <>
      <h1 className="mb-lg text-2xl font-bold text-primary">Overview</h1>
      <Problem error={error} />
      <div className="grid grid-cols-2 gap-md md:grid-cols-3">
        {tiles.map((tile) => (
          <button key={tile.label} type="button" onClick={() => go(tile.page)} className="text-left">
            <Card>
              <p className="text-3xl font-bold text-on-surface">{tile.value ?? '…'}</p>
              <p className="text-sm text-on-surface-variant">{tile.label}</p>
            </Card>
          </button>
        ))}
      </div>
    </>
  )
}
