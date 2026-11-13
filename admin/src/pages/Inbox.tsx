import { useState } from 'react'
import type { PageProps } from '../App'
import { when, type MailboxSummary, type MessageRow, type ThreadSummary } from '../api'
import { Button, Card, Pill, Problem, input } from '../ui'
import { useLoad } from './useLoad'

/**
 * Mail to every @afrocoils.app address, one inbox per address. Resend
 * receives for the whole domain, so support@ and hello@ are joined by
 * any other address someone writes to; "All mail" shows them together.
 * Replies go out from the address the message came to (no-reply@ is
 * answered from support@), through Resend, and are filed in the same
 * conversation. Everything is text: HTML mail was reduced to text when
 * it arrived.
 */
export default function Inbox({ api }: PageProps) {
  const [mailbox, setMailbox] = useState('') // '' is All mail
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open')
  const [openId, setOpenId] = useState<number | null>(null)
  const [composing, setComposing] = useState(false)
  const boxes = useLoad(() => api.get<MailboxSummary[]>('mailboxes'), 'mailboxes')
  const threads = useLoad(
    () => api.get<ThreadSummary[]>('threads', { status, mailbox }),
    `threads:${status}:${mailbox}`,
  )
  const refresh = () => {
    threads.reload()
    boxes.reload()
  }
  const current = boxes.data?.find((b) => b.mailbox === mailbox)

  if (openId !== null) {
    return (
      <Thread
        api={api}
        id={openId}
        onBack={() => {
          setOpenId(null)
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
      <div className="mb-lg flex flex-wrap items-center justify-between gap-sm">
        <div>
          <h1 className="text-2xl font-bold text-primary">{current ? current.address : 'All mail'}</h1>
          {current && current.repliesFrom !== current.address && (
            <p className="text-xs text-on-surface-variant">Answered from {current.repliesFrom}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-xs">
          {(['open', 'closed', 'all'] as const).map((s) => (
            <Button key={s} kind={s === status ? 'primary' : 'quiet'} onClick={() => setStatus(s)}>
              {s[0]!.toUpperCase() + s.slice(1)}
            </Button>
          ))}
          <Button kind="quiet" onClick={() => setComposing(true)}>
            New message
          </Button>
        </div>
      </div>
      <Problem error={boxes.error ?? threads.error} />
      <div className="gap-lg md:flex">
        <nav aria-label="Mailboxes" className="mb-lg md:mb-0 md:w-56 md:shrink-0">
          <ul className="flex flex-wrap gap-xs md:flex-col">
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
        <div className="min-w-0 flex-1 space-y-sm">
          {threads.data?.length === 0 && <p className="text-sm text-on-surface-variant">Nothing here.</p>}
          {threads.data?.map((t) => (
            <button key={t.id} type="button" onClick={() => setOpenId(t.id)} className="block w-full text-left">
              <Card className="!p-md">
                <div className="flex items-center justify-between gap-sm">
                  <p className={`truncate ${t.unread ? 'font-bold' : ''}`}>{t.subject || '(no subject)'}</p>
                  <span className="shrink-0 text-xs text-on-surface-variant">{when(t.lastISO)}</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  {t.with}
                  {mailbox === '' && ` · to ${t.mailbox}@`} · {t.count} message{t.count === 1 ? '' : 's'}{' '}
                  {t.unread && <Pill tone="warn">unread</Pill>} {t.status === 'closed' && <Pill>closed</Pill>}
                </p>
                <p className="mt-xs line-clamp-2 text-sm text-on-surface-variant">{t.preview}</p>
              </Card>
            </button>
          ))}
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
    <li>
      <button
        type="button"
        title={title}
        onClick={onClick}
        aria-current={selected ? 'true' : undefined}
        className={`flex w-full items-center justify-between gap-sm rounded-xl px-md py-2 text-left text-sm ${
          selected ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container-lowest shadow-card'
        }`}
      >
        <span className="min-w-0">
          <span className={`block truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{label}</span>
          {detail && <span className="block text-xs opacity-75">{detail}</span>}
        </span>
        {unread > 0 && (
          <span className="shrink-0 rounded-full bg-secondary px-sm py-0.5 text-xs font-bold text-on-secondary">
            {unread}
          </span>
        )}
      </button>
    </li>
  )
}

/** Where a reply to this mailbox is sent from: no-reply@ is answered from support@. */
const repliesFrom = (mailbox: string) => `${mailbox === 'no-reply' ? 'support' : mailbox}@afrocoils.app`

function Thread({ api, id, onBack }: { api: PageProps['api']; id: number; onBack: () => void }) {
  const messages = useLoad(() => api.get<MessageRow[]>('thread', { id: String(id) }), `thread:${id}`)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
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

  return (
    <>
      <button type="button" onClick={onBack} className="mb-md text-sm text-primary underline">
        ← All conversations
      </button>
      <h1 className="text-xl font-bold text-primary">{first?.subject || 'Conversation'}</h1>
      {first && <p className="mb-lg text-xs text-on-surface-variant">In {first.mailbox}@afrocoils.app</p>}
      <Problem error={messages.error} />
      <div className="mb-lg space-y-sm">
        {messages.data?.map((m) => (
          <Card key={m.id} className={`!p-md ${m.direction === 'out' ? 'ml-xl bg-secondary-fixed/30' : 'mr-xl'}`}>
            <p className="mb-xs text-xs text-on-surface-variant">
              {m.direction === 'in' ? m.from_address : `${m.sent_by ?? m.from_address} → ${m.to_address}`} ·{' '}
              {when(m.created_at)}
            </p>
            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          </Card>
        ))}
      </div>
      <Card>
        <label htmlFor="reply" className="mb-sm block text-sm font-bold">
          Reply{first ? ` from ${repliesFrom(first.mailbox)}` : ''}
        </label>
        <textarea id="reply" rows={6} value={text} onChange={(e) => setText(e.target.value)} className={`${input} mb-sm w-full`} />
        <div className="flex flex-wrap gap-xs">
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
          <Button kind="quiet" disabled={busy} onClick={() => void run(() => api.post('thread-status', { thread: id, status: 'closed' }))}>
            Close conversation
          </Button>
          <Button kind="quiet" disabled={busy} onClick={() => void run(() => api.post('thread-status', { thread: id, status: 'open' }))}>
            Reopen
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
      <button type="button" onClick={onDone} className="mb-md text-sm text-primary underline">
        ← All conversations
      </button>
      <h1 className="mb-lg text-xl font-bold text-primary">New message</h1>
      <Problem error={error} />
      <Card className="space-y-sm">
        <select value={mailbox} onChange={(e) => setMailbox(e.target.value)} className={`${input} w-full`}>
          {senders.map((name) => (
            <option key={name} value={name}>
              From {name}@afrocoils.app
            </option>
          ))}
        </select>
        <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" className={`${input} w-full`} />
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={`${input} w-full`} />
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} className={`${input} w-full`} />
        <Button disabled={busy || !to || !subject || !text.trim()} onClick={() => void send()}>
          {busy ? 'Sending…' : 'Send'}
        </Button>
      </Card>
    </>
  )
}
