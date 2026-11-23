import { useState } from 'react'
import type { PageProps } from '../App'
import { when, type MailboxSummary, type MessageRow, type ThreadSummary } from '../api'
import { Button, Card, Field, Icon, ListState, PageHeader, Panel, Pill, Problem, Segmented, input } from '../ui'
import { useLoad } from './useLoad'

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
] as const
type Status = (typeof STATUSES)[number]['value']

/**
 * Mail to every @afrocoils.app address, one inbox per address. Resend
 * receives for the whole domain, so support@ and hello@ are joined by
 * any other address someone writes to; "All mail" shows them together.
 * Replies go out from the address the message came to (no-reply@ is
 * answered from support@), through Resend, and are filed in the same
 * conversation. Everything is text: HTML mail was reduced to text when
 * it arrived.
 */
export default function Inbox({ api, recount }: PageProps) {
  const [mailbox, setMailbox] = useState('') // '' is All mail
  const [status, setStatus] = useState<Status>('open')
  const [opened, setOpened] = useState<ThreadSummary | null>(null)
  const [composing, setComposing] = useState(false)
  const boxes = useLoad(() => api.get<MailboxSummary[]>('mailboxes'), 'mailboxes')
  const threads = useLoad(
    () => api.get<ThreadSummary[]>('threads', { status, mailbox }),
    `threads:${status}:${mailbox}`,
  )
  const refresh = () => {
    threads.reload()
    boxes.reload()
    recount()
  }
  const current = boxes.data?.find((b) => b.mailbox === mailbox)

  if (opened) {
    return (
      <Thread
        api={api}
        thread={opened}
        onBack={() => {
          setOpened(null)
          refresh()
        }}
      />
    )
  }
  if (composing) {
    return (
      <Compose
        api={api}
        boxes={boxes.data ?? []}
        from={mailbox}
        onDone={() => {
          setComposing(false)
          refresh()
        }}
      />
    )
  }

  const allUnread = boxes.data?.reduce((n, b) => n + b.unread, 0) ?? 0

  return (
    <>
      <PageHeader
        title={current ? current.address : 'All mail'}
        lede={current && current.repliesFrom !== current.address ? `Answered from ${current.repliesFrom}` : undefined}
      >
        <Segmented label="Conversation status" options={STATUSES} value={status} onChange={setStatus} />
        <Button onClick={() => setComposing(true)}>
          <Icon name="plus" className="h-4 w-4" />
          New message
        </Button>
      </PageHeader>
      <Problem error={boxes.error ?? threads.error} />

      <div className="items-start gap-lg md:flex">
        <nav aria-label="Mailboxes" className="mb-lg md:mb-0 md:w-56 md:shrink-0">
          <ul className="relative flex gap-xs overflow-x-auto pb-xs md:flex-col md:gap-0.5 md:overflow-visible md:pb-0">
            <MailboxLink label="All mail" unread={allUnread} selected={mailbox === ''} onClick={() => setMailbox('')} />
            {boxes.data?.map((b) => (
              <MailboxLink
                key={b.mailbox}
                label={`${b.mailbox}@`}
                title={b.address}
                unread={b.unread}
                detail={`${b.open} open · ${b.total} total`}
                selected={mailbox === b.mailbox}
                onClick={() => setMailbox(b.mailbox)}
              />
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <ListState data={threads.data} error={threads.error} empty="Nothing here." />
          {threads.data && threads.data.length > 0 && (
            <Panel>
              {threads.data.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOpened(t)}
                  className="flex w-full items-start gap-sm px-lg py-md text-left transition-colors hover:bg-surface-container-low"
                >
                  {/* The dot holds its column whether or not it shows, so subjects line up. */}
                  <span
                    aria-hidden
                    className={`mt-2 h-2 w-2 shrink-0 rounded-full ${t.unread ? 'bg-secondary' : 'bg-transparent'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-md">
                      <span className={`truncate ${t.unread ? 'font-bold text-on-surface' : 'font-semibold text-on-surface'}`}>
                        {t.unread && <span className="sr-only">Unread: </span>}
                        {t.subject || '(no subject)'}
                      </span>
                      <span className="shrink-0 text-xs text-on-surface-variant">{when(t.lastISO)}</span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-sm text-xs text-on-surface-variant">
                      <span className="break-all">{t.with}</span>
                      {mailbox === '' && <span>to {t.mailbox}@</span>}
                      <span>
                        {t.count} message{t.count === 1 ? '' : 's'}
                      </span>
                      {t.status === 'closed' && <Pill>closed</Pill>}
                    </span>
                    <span className="mt-xs line-clamp-2 block text-sm text-on-surface-variant">{t.preview}</span>
                  </span>
                </button>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}

function MailboxLink({
  label,
  title,
  unread,
  detail,
  selected,
  onClick,
}: {
  label: string
  title?: string
  unread: number
  detail?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        title={title}
        onClick={onClick}
        aria-current={selected ? 'true' : undefined}
        className={`flex w-full items-center justify-between gap-md rounded-2xl px-md py-2 text-left text-sm transition-colors ${
          selected ? 'bg-inverse-surface text-inverse-on-surface' : 'text-on-surface hover:bg-surface-container-high'
        }`}
      >
        <span className="min-w-0">
          <span className={`block truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{label}</span>
          {detail && (
            <span className={`block whitespace-nowrap text-xs ${selected ? 'text-inverse-on-surface' : 'text-on-surface-variant'}`}>
              {detail}
            </span>
          )}
        </span>
        {unread > 0 && (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-on-secondary">
            {unread}
            <span className="sr-only"> unread</span>
          </span>
        )}
      </button>
    </li>
  )
}

/** Where a reply to this mailbox is sent from: no-reply@ is answered from support@. */
const repliesFrom = (mailbox: string) => `${mailbox === 'no-reply' ? 'support' : mailbox}@afrocoils.app`

function Thread({ api, thread, onBack }: { api: PageProps['api']; thread: ThreadSummary; onBack: () => void }) {
  const id = thread.id
  const messages = useLoad(() => api.get<MessageRow[]>('thread', { id: String(id) }), `thread:${id}`)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  // Starts from the list's answer and follows what is done here.
  const [status, setStatus] = useState(thread.status)
  const first = messages.data?.[0]

  async function run(task: () => Promise<unknown>) {
    setBusy(true)
    try {
      await task()
      messages.reload()
    } catch (e) {
      messages.setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const setThreadStatus = (next: ThreadSummary['status']) =>
    run(async () => {
      await api.post('thread-status', { thread: id, status: next })
      setStatus(next)
    })

  return (
    <>
      <PageHeader
        back={{ label: 'All conversations', onClick: onBack }}
        title={first?.subject || thread.subject || 'Conversation'}
        lede={`With ${thread.with}, in ${thread.mailbox}@afrocoils.app`}
      >
        {status === 'closed' && <Pill>closed</Pill>}
        {status === 'open' ? (
          <Button kind="quiet" disabled={busy} onClick={() => void setThreadStatus('closed')}>
            Close conversation
          </Button>
        ) : (
          <Button kind="quiet" disabled={busy} onClick={() => void setThreadStatus('open')}>
            Reopen
          </Button>
        )}
      </PageHeader>
      <Problem error={messages.error} />

      <ListState data={messages.data} error={messages.error} empty="No messages in this conversation." />
      <ol className="mb-lg space-y-md">
        {messages.data?.map((m) => {
          const out = m.direction === 'out'
          return (
            <li key={m.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[46rem] rounded-2xl px-lg py-md shadow-card ${
                  out ? 'ml-lg bg-inverse-surface text-inverse-on-surface' : 'mr-lg bg-surface-container-lowest text-on-surface'
                }`}
              >
                <p className={`mb-xs text-xs ${out ? 'text-inverse-on-surface' : 'text-on-surface-variant'}`}>
                  <span className="font-bold">
                    {out ? `${m.sent_by ?? m.from_address} → ${m.to_address}` : m.from_address}
                  </span>{' '}
                  · {when(m.created_at)}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <Card>
        <Field label={`Reply from ${repliesFrom(first?.mailbox ?? thread.mailbox)}`}>
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} className={`${input} w-full font-normal`} />
        </Field>
        <div className="mt-md flex justify-end">
          <Button
            disabled={busy || !text.trim()}
            onClick={() =>
              void run(async () => {
                await api.post('reply', { thread: id, text })
                setText('')
              })
            }
          >
            {busy ? 'Sending…' : 'Send reply'}
          </Button>
        </div>
      </Card>
    </>
  )
}

function Compose({
  api,
  boxes,
  from,
  onDone,
}: {
  api: PageProps['api']
  boxes: MailboxSummary[]
  from: string
  onDone: () => void
}) {
  // Every address mail can be written from; no-reply@ is never one.
  const senders = boxes.filter((b) => b.mailbox !== 'no-reply').map((b) => b.mailbox)
  if (!senders.includes('support')) senders.unshift('support')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [mailbox, setMailbox] = useState(senders.includes(from) ? from : 'support')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setBusy(true)
    setError(null)
    try {
      await api.post('compose', { to, subject, text, mailbox })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader back={{ label: 'All conversations', onClick: onDone }} title="New message" />
      <Problem error={error} />
      <Card className="max-w-3xl">
        <div className="grid gap-md sm:grid-cols-2">
          <Field label="From">
            <select value={mailbox} onChange={(e) => setMailbox(e.target.value)} className={input}>
              {senders.map((name) => (
                <option key={name} value={name}>
                  {name}@afrocoils.app
                </option>
              ))}
            </select>
          </Field>
          <Field label="To">
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} className={input} />
          </Field>
          <Field label="Subject" className="sm:col-span-2">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
          </Field>
          <Field label="Message" className="sm:col-span-2">
            <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} className={`${input} font-normal`} />
          </Field>
        </div>
        <div className="mt-md flex justify-end">
          <Button disabled={busy || !to || !subject || !text.trim()} onClick={() => void send()}>
            {busy ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </Card>
    </>
  )
}
