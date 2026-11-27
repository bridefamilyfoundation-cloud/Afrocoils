import { useMemo, useState } from 'react'
import type { PageProps } from '../App'
import { day, when, type BroadcastRow, type ContactRow } from '../api'
import { Button, Card, Field, Icon, ListState, PageHeader, Panel, Pill, Problem, SectionTitle, Segmented, checkbox, input } from '../ui'
import { useLoad } from './useLoad'

type Show = 'subscribed' | 'unsubscribed' | 'all'
const SHOW: readonly { value: Show; label: string }[] = [
  { value: 'subscribed', label: 'Subscribed' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'all', label: 'All' },
]

type Audience = 'all' | 'ticked'

/**
 * The mailing list, and one message to many people at once.
 *
 * Add people by typing or pasting addresses (one per line, or separated
 * by commas), or bring in every member with one button. Tick who to
 * write to — or send to everyone subscribed — write it, and send. Each
 * person gets their own copy, from hello@afrocoils.app, with an
 * unsubscribe link at the foot; replies land in the hello inbox.
 *
 * Add only people who asked to hear from AfroCoils. Someone who
 * unsubscribes stays on the list, greyed out, as the record never to
 * write to them again: adding them back here does not undo it.
 */
export default function Mailing({ api, recount }: PageProps) {
  const [show, setShow] = useState<Show>('subscribed')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const contacts = useLoad(() => api.get<ContactRow[]>('contacts', { q: search }), `contacts:${search}`)
  const sent = useLoad(() => api.get<BroadcastRow[]>('broadcasts'), 'broadcasts')
  const [ticked, setTicked] = useState<Set<string>>(new Set())

  const rows = useMemo(
    () =>
      (contacts.data ?? []).filter((c) =>
        show === 'all' ? true : show === 'subscribed' ? !c.unsubscribed_at : !!c.unsubscribed_at,
      ),
    [contacts.data, show],
  )
  const subscribed = useMemo(() => (contacts.data ?? []).filter((c) => !c.unsubscribed_at), [contacts.data])
  const tickable = rows.filter((c) => !c.unsubscribed_at)
  const allTicked = tickable.length > 0 && tickable.every((c) => ticked.has(c.email))

  const toggle = (email: string) =>
    setTicked((current) => {
      const next = new Set(current)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  const toggleAll = () =>
    setTicked((current) => {
      const next = new Set(current)
      for (const c of tickable) {
        if (allTicked) next.delete(c.email)
        else next.add(c.email)
      }
      return next
    })

  const changed = () => {
    contacts.reload()
    recount()
  }

  async function removeTicked() {
    const emails = [...ticked]
    if (!confirm(`Take ${emails.length} ${emails.length === 1 ? 'address' : 'addresses'} off the list?`)) return
    try {
      await api.post('contacts', { action: 'remove', emails })
      setTicked(new Set())
      changed()
    } catch (e) {
      contacts.setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <>
      <PageHeader
        title="Mailing list"
        lede="Write to many people at once. Add only people who asked to hear from AfroCoils. Every email carries its own unsubscribe link, and anyone who uses it is never written to again."
      >
        <Segmented label="Show" options={SHOW} value={show} onChange={setShow} />
      </PageHeader>

      <AddPeople api={api} onAdded={changed} />

      <SectionTitle
        note={`${subscribed.length} subscribed${
          contacts.data && contacts.data.length > subscribed.length
            ? `, ${contacts.data.length - subscribed.length} unsubscribed`
            : ''
        }. Tick the people to write to, or choose “Everyone subscribed” below.`}
      >
        People
      </SectionTitle>

      <form
        onSubmit={(e) => (e.preventDefault(), setSearch(query.trim()))}
        className="mb-md flex flex-wrap items-center gap-sm"
        role="search"
      >
        <label className="relative min-w-0 flex-1 basis-64">
          <span className="sr-only">Search addresses</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email"
            className={`${input} w-full pl-9`}
          />
        </label>
        <Button kind="quiet" type="submit">
          Search
        </Button>
        {ticked.size > 0 && (
          <Button kind="danger" onClick={() => void removeTicked()}>
            Remove {ticked.size}
          </Button>
        )}
      </form>

      <Problem error={contacts.error} />
      <ListState
        data={contacts.data && rows}
        error={contacts.error}
        empty={
          search
            ? `Nobody matches “${search}”.`
            : show === 'unsubscribed'
              ? 'Nobody has unsubscribed.'
              : 'Nobody on the list yet. Add people above.'
        }
      />
      {rows.length > 0 && (
        <Panel>
          <label className="flex items-center gap-md bg-surface-container-low px-lg py-sm text-sm font-semibold text-on-surface">
            <input type="checkbox" className={checkbox} checked={allTicked} disabled={tickable.length === 0} onChange={toggleAll} />
            {allTicked ? 'Untick all' : `Tick all ${tickable.length} shown`}
            {ticked.size > 0 && <span className="ml-auto font-normal text-on-surface-variant">{ticked.size} ticked</span>}
          </label>
          <ul className="max-h-[28rem] divide-y divide-outline-variant/40 overflow-y-auto">
            {rows.map((c) => {
              const off = !!c.unsubscribed_at
              return (
                <li key={c.email}>
                  <label className={`flex items-center gap-md px-lg py-sm ${off ? 'opacity-60' : 'cursor-pointer hover:bg-surface-container-low'}`}>
                    <input
                      type="checkbox"
                      className={checkbox}
                      checked={ticked.has(c.email)}
                      disabled={off}
                      onChange={() => toggle(c.email)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block break-all text-sm font-semibold text-on-surface">{c.email}</span>
                      <span className="block text-xs text-on-surface-variant">
                        {c.name ? `${c.name} · ` : ''}
                        {off ? `Unsubscribed ${day(c.unsubscribed_at)}` : `Added ${day(c.added_at)}`}
                      </span>
                    </span>
                    {c.member && <Pill tone="good">Member</Pill>}
                    {off && <Pill tone="bad">Unsubscribed</Pill>}
                  </label>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <Compose
        api={api}
        ticked={[...ticked]}
        subscribed={subscribed.length}
        onSent={() => {
          setTicked(new Set())
          sent.reload()
        }}
      />

      <SectionTitle note="Everything sent to the list, newest first.">Sent</SectionTitle>
      <Problem error={sent.error} />
      <ListState data={sent.data} error={sent.error} empty="Nothing sent yet." />
      {sent.data && sent.data.length > 0 && (
        <Panel>
          {sent.data.map((b) => (
            <details key={b.id} className="group px-lg py-md">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-sm">
                <Icon name="chevron" className="h-4 w-4 text-on-surface-variant transition-transform group-open:rotate-90" />
                <span className="min-w-0 flex-1 break-words text-sm font-semibold text-on-surface">{b.subject}</span>
                <span className="text-xs text-on-surface-variant">
                  {b.recipients} sent{b.failed ? `, ${b.failed} failed` : ''} · {when(b.sent_at)} · {b.sent_by}
                </span>
              </summary>
              <p className="mt-sm whitespace-pre-wrap break-words pl-6 text-sm text-on-surface">{b.body}</p>
            </details>
          ))}
        </Panel>
      )}
    </>
  )
}

function AddPeople({ api, onAdded }: { api: PageProps['api']; onAdded: () => void }) {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState('')

  async function run(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    setResult('')
    try {
      const r = await api.post<{ added: number; already: number; invalid: string[] }>('contacts', body)
      setResult(
        [
          `${r.added} added`,
          r.already ? `${r.already} already on the list` : '',
          r.invalid.length ? `not addresses, skipped: ${r.invalid.slice(0, 5).join(', ')}${r.invalid.length > 5 ? '…' : ''}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      )
      if (body.action === 'add') (setText(''), setName(''))
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const single = text.trim().split(/[\s,;]+/).filter((t) => t.includes('@')).length === 1

  return (
    <Card>
      <h2 className="mb-xs text-lg font-bold text-primary">Add people</h2>
      <p className="mb-md text-sm text-on-surface-variant">
        Type one address, or paste many — one per line, or separated by commas.
      </p>
      <Problem error={error} />
      <div className="grid gap-md md:grid-cols-[minmax(0,1fr)_14rem]">
        <Field label="Email addresses">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={'ada@example.com\nchioma@example.com, funmi@example.com'}
            className={`${input} resize-y font-normal`}
          />
        </Field>
        <Field label="Name (optional)" hint={single ? 'For your own reference.' : 'Only when adding one address.'}>
          <input value={name} maxLength={80} disabled={!single} onChange={(e) => setName(e.target.value)} className={input} />
        </Field>
      </div>
      <div className="mt-md flex flex-wrap items-center justify-end gap-sm">
        <span role="status" className="mr-auto text-sm text-on-surface-variant">
          {result}
        </span>
        <Button
          kind="quiet"
          disabled={busy}
          onClick={() => {
            if (confirm('Add every member’s email to the list? Anyone who unsubscribed stays unsubscribed.')) {
              void run({ action: 'import-members' })
            }
          }}
        >
          Add all members
        </Button>
        <Button disabled={busy || !text.trim()} onClick={() => void run({ action: 'add', text, name: single ? name : '' })}>
          <Icon name="plus" className="h-4 w-4" />
          {busy ? 'Adding…' : 'Add'}
        </Button>
      </div>
    </Card>
  )
}

function Compose({
  api,
  ticked,
  subscribed,
  onSent,
}: {
  api: PageProps['api']
  ticked: string[]
  subscribed: number
  onSent: () => void
}) {
  const [audience, setAudience] = useState<Audience>('all')
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState('')

  // Ticking someone means "write to these": follow it, until they are all unticked.
  const who: Audience = ticked.length > 0 ? audience : 'all'
  const count = who === 'all' ? subscribed : ticked.length
  const options = [
    { value: 'all' as const, label: `Everyone subscribed (${subscribed})` },
    ...(ticked.length > 0 ? [{ value: 'ticked' as const, label: `Only ticked (${ticked.length})` }] : []),
  ]

  async function send() {
    if (!confirm(`Send “${subject.trim()}” to ${count} ${count === 1 ? 'person' : 'people'}? This cannot be undone.`)) return
    setBusy(true)
    setError(null)
    setResult('')
    try {
      const r = await api.post<{ sent: number; failed: number; skipped: number }>('broadcast', {
        subject,
        text,
        to: who === 'all' ? 'all' : ticked,
      })
      setResult(
        `Sent to ${r.sent}.${r.failed ? ` ${r.failed} could not be sent — try them again later.` : ''}${
          r.skipped ? ` ${r.skipped} skipped (unsubscribed or not on the list).` : ''
        }`,
      )
      if (!r.failed) (setSubject(''), setText(''))
      onSent()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SectionTitle note="Sent from hello@afrocoils.app; replies come to the hello inbox under Mail. A line about why they are getting it, and an unsubscribe link, are added at the foot.">
        Write a message
      </SectionTitle>
      <Card>
        <Problem error={error} />
        <div className="mb-md">
          <p className="mb-xs text-sm font-semibold text-on-surface">To</p>
          <Segmented
            label="Who to send to"
            options={options}
            value={who}
            onChange={(v) => setAudience(v)}
          />
        </div>
        <div className="grid gap-md">
          <Field label="Subject">
            <input
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Black Friday: 20% off membership"
              className={input}
            />
          </Field>
          <Field label="Message" hint="Plain text. A blank line starts a new paragraph.">
            <textarea
              value={text}
              rows={10}
              maxLength={20_000}
              onChange={(e) => setText(e.target.value)}
              className={`${input} resize-y font-normal`}
            />
          </Field>
        </div>
        <div className="mt-lg flex flex-wrap items-center justify-end gap-sm border-t border-outline-variant/40 pt-md">
          <span role="status" className="mr-auto text-sm text-on-surface-variant">
            {busy ? `Sending to ${count}… keep this tab open.` : result}
          </span>
          <Button disabled={busy || count === 0 || !subject.trim() || !text.trim()} onClick={() => void send()}>
            <Icon name="send" className="h-4 w-4" />
            {busy ? 'Sending…' : `Send to ${count}`}
          </Button>
        </div>
      </Card>
    </>
  )
}
