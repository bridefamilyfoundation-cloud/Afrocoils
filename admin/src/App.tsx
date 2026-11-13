import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { AdminSessionResponse } from '../../src/lib/types'
import { adminApi, loadSession, saveSession, sendCode, verify, type AdminApi } from './api'
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import Members from './pages/Members'
import Payments from './pages/Payments'
import Questions from './pages/Questions'
import Submissions from './pages/Submissions'
import { Button, Card, Problem, input } from './ui'

const PAGES = {
  dashboard: { label: 'Overview', Page: Dashboard },
  members: { label: 'Members', Page: Members },
  payments: { label: 'Payments', Page: Payments },
  inbox: { label: 'Mail', Page: Inbox },
  submissions: { label: 'Style submissions', Page: Submissions },
  questions: { label: 'Ask questions', Page: Questions },
} as const
export type PageName = keyof typeof PAGES

export interface PageProps {
  api: AdminApi
  go: (page: PageName) => void
}

const pageFromHash = (): PageName => {
  const name = location.hash.replace(/^#\/?/, '') as PageName
  return name in PAGES ? name : 'dashboard'
}

export default function App() {
  const [session, setSession] = useState<AdminSessionResponse | null>(loadSession)
  const [page, setPage] = useState<PageName>(pageFromHash)

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const signOut = useCallback(() => {
    saveSession(null)
    setSession(null)
  }, [])

  if (!session) return <SignIn onSignedIn={(s) => (saveSession(s), setSession(s))} />

  const api = adminApi(session.token, signOut)
  const go = (name: PageName) => (location.hash = `/${name}`)
  const { Page } = PAGES[page]

  return (
    <div className="min-h-screen md:flex">
      <nav className="bg-inverse-surface p-md text-inverse-on-surface md:min-h-screen md:w-60 md:shrink-0">
        <p className="mb-lg px-sm text-lg font-bold">AfroCoils admin</p>
        <ul className="flex flex-wrap gap-xs md:flex-col">
          {(Object.keys(PAGES) as PageName[]).map((name) => (
            <li key={name}>
              <a
                href={`#/${name}`}
                aria-current={page === name ? 'page' : undefined}
                className={`block rounded-full px-md py-2 text-sm font-semibold ${
                  page === name ? 'bg-secondary text-on-secondary' : 'hover:bg-white/10'
                }`}
              >
                {PAGES[name].label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-lg px-sm text-xs opacity-80">
          <p className="truncate">{session.email}</p>
          <button type="button" onClick={signOut} className="mt-xs underline">
            Sign out
          </button>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-6xl p-md md:p-xl">
        <Page api={api} go={go} />
      </main>
    </div>
  )
}

function SignIn({ onSignedIn }: { onSignedIn: (session: AdminSessionResponse) => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (!sent) {
        await sendCode(email.trim())
        setSent(true)
      } else {
        onSignedIn(await verify(email.trim(), code))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-md">
      <Card className="w-full max-w-sm">
        <h1 className="mb-xs text-xl font-bold text-primary">AfroCoils admin</h1>
        <p className="mb-lg text-sm text-on-surface-variant">
          {sent
            ? `If ${email.trim()} is an admin address, a code is on its way.`
            : 'Sign in with an admin email. A six-digit code is sent to it.'}
        </p>
        <Problem error={error} />
        <form onSubmit={submit} className="flex flex-col gap-md">
          {!sent ? (
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@afrocoils.app"
              className={input}
            />
          ) : (
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className={`${input} text-center text-lg tracking-[0.4em]`}
            />
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Working…' : sent ? 'Sign in' : 'Send code'}
          </Button>
          {sent && (
            <button type="button" onClick={() => setSent(false)} className="text-sm text-on-surface-variant underline">
              Use a different email
            </button>
          )}
        </form>
      </Card>
    </div>
  )
}
