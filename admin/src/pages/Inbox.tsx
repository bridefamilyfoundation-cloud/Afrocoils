import { useState } from 'react'
import type { PageProps } from '../App'
import { when, type MessageRow, type ThreadSummary } from '../api'
import { Button, Card, Pill, Problem, input } from '../ui'
import { useLoad } from './useLoad'

/**
 * Mail to support@ and hello@afrocoils.app, as conversations. Replies go
 * out from the address the message came to, through Resend, and are
 * filed in the same thread. Everything is shown as text: HTML mail was
 * reduced to text when it arrived.
 */
export default function Inbox({ api }: PageProps) {
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open')
  const [openId, setOpenId] = useState<number | null>(null)
  const [composing, setComposing] = useState(false)
  const threads = useLoad(() => api.get<ThreadSummary[]>('threads', { status }), `threads:${status}`)

  if (openId !== null) {
    return (
      <Thread
        api={api}
        id={openId}
        onBack={() => {
          setOpenId(null)
          threads.reload()
        }}
      />
    )
  }
  if (composing) return <Compose api={api} onDone={() => (setComposing(false), threads.reload())} />

  return (
    <>
      <div className="mb-lg flex flex-wrap items-center justify-between gap-sm">
        <h1 className="text-2xl font-bold text-primary">Inbox</h1>
        <div className="flex gap-xs">
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
      <Problem error={threads.error} />
      <div className="space-y-sm">
        {threads.data?.length === 0 && <p className="text-sm text-on-surface-variant">Nothing here.</p>}
        {threads.data?.map((t) => (
          <button key={t.id} type="button" onClick={() => setOpenId(t.id)} className="block w-full text-left">
            <Card className="!p-md">
              <div className="flex items-center justify-between gap-sm">
                <p className={`truncate ${t.unread ? 'font-bold' : ''}`}>
                  {t.subject || '(no subject)'}
                </p>
                <span className="shrink-0 text-xs text-on-surface-variant">{when(t.lastISO)}</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                {t.with} · to {t.mailbox}@ · {t.count} message{t.count === 1 ? '' : 's'}{' '}
                {t.unread && <Pill tone="warn">unread</Pill>} {t.status === 'closed' && <Pill>closed</Pill>}
              </p>
              <p className="mt-xs line-clamp-2 text-sm text-on-surface-variant">{t.preview}</p>
            </Card>
          </button>
        ))}
      </div>
    </>
  )
}

function Thread({ api, id, onBack }: { api: PageProps['api']; id: number; onBack: () => void }) {
  const messages = useLoad(() => api.get<MessageRow[]>('thread', { id: String(id) }), `thread:${id}`)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const last = messages.data?.[messages.data.length - 1]

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
      <h1 className="mb-lg text-xl font-bold text-primary">{messages.data?.[0]?.subject || 'Conversation'}</h1>
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
          Reply{last ? ` from ${last.mailbox}@afrocoils.app` : ''}
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

function Compose({ api, onDone }: { api: PageProps['api']; onDone: () => void }) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [mailbox, setMailbox] = useState<'support' | 'hello'>('support')
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
        <select value={mailbox} onChange={(e) => setMailbox(e.target.value as 'support' | 'hello')} className={`${input} w-full`}>
          <option value="support">From support@afrocoils.app</option>
          <option value="hello">From hello@afrocoils.app</option>
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
