import { useCallback, useEffect, useState, type FormEvent } from 'react'
import BrandLockup from '../../src/components/BrandMark'
import type { AdminSessionResponse } from '../../src/lib/types'
import { adminApi, endSession, loadSession, saveSession, sendCode, verify, type AdminApi, type Overview } from './api'
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import Mailing from './pages/Mailing'
import Members from './pages/Members'
import Payments from './pages/Payments'
import Questions from './pages/Questions'
import Submissions from './pages/Submissions'
import Transfers from './pages/Transfers'
import { useLoad } from './pages/useLoad'
import { Button, Card, Field, Icon, Problem, input, type IconName } from './ui'

/**
 * `waiting` is the number beside a page's name: how many things on it
 * need a person. Pages that are records rather than queues have none.
 */
const PAGES = {
  dashboard: { label: 'Overview', icon: 'overview', Page: Dashboard },
  members: { label: 'Members', icon: 'members', Page: Members },
  transfers: { label: 'Bank transfers', icon: 'transfers', Page: Transfers, waiting: (o: Overview) => o.transfers },
  payments: { label: 'Payments', icon: 'payments', Page: Payments },
  inbox: { label: 'Mail', icon: 'mail', Page: Inbox, waiting: (o: Overview) => o.unread },
  mailing: { label: 'Mailing list', icon: 'broadcast', Page: Mailing },
  submissions: { label: 'Style submissions', icon: 'submissions', Page: Submissions, waiting: (o: Overview) => o.pending },
  questions: { label: 'Ask questions', icon: 'questions', Page: Questions, waiting: (o: Overview) => o.unanswered },
} as const satisfies Record<
  string,
  { label: string; icon: IconName; Page: (props: PageProps) => unknown; waiting?: (o: Overview) => number }
>
export type PageName = keyof typeof PAGES

/** The sidebar's order: money first, because it is what members wait on. */
const NAV: readonly { label?: string; pages: readonly PageName[] }[] = [
  { pages: ['dashboard'] },
  { label: 'Membership', pages: ['members', 'transfers', 'payments'] },
  { label: 'Support', pages: ['inbox', 'mailing'] },
  { label: 'Content', pages: ['submissions', 'questions'] },
]

export interface PageProps {
  api: AdminApi
  go: (page: PageName) => void
  /** The counts the sidebar shows; a page that changes one calls `recount`. */
  overview: { data: Overview | undefined; error: string | null }
  recount: () => void
}

const pageFromHash = (): PageName => {
  const name = location.hash.replace(/^#\/?/, '') as PageName
  return name in PAGES ? name : 'dashboard'
}

export function waitingOn(page: PageName, overview: Overview | undefined): number {
  const entry = PAGES[page]
  return overview && 'waiting' in entry ? entry.waiting(overview) : 0
}

export default function App() {
  const [session, setSession] = useState<AdminSessionResponse | null>(loadSession)
  const signOut = useCallback(() => {
    void endSession()
    setSession(null)
  }, [])

  if (!session) return <SignIn onSignedIn={(s) => (saveSession(s), setSession(s))} />
  return <Shell session={session} signOut={signOut} />
}

function Shell({ session, signOut }: { session: AdminSessionResponse; signOut: () => void }) {
  const [page, setPage] = useState<PageName>(pageFromHash)

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  // On a phone the sections are one scrolling row: keep the current one in it.
  useEffect(() => {
    document.querySelector('nav [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [page])

  const api = adminApi(signOut)
  const go = (name: PageName) => (location.hash = `/${name}`)
  // Counted again on every page change, so a queue cleared on one page
  // is cleared in the sidebar by the time you look back at it.
  const overview = useLoad(() => api.get<Overview>('overview'), `overview:${page}`)
  const { Page } = PAGES[page]

  return (
    <div className="min-h-screen md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-md focus:top-md focus:z-10 focus:rounded-full focus:bg-inverse-surface focus:px-md focus:py-2 focus:text-sm focus:font-bold focus:text-inverse-on-surface"
      >
        Skip to the page
      </a>

      <aside className="bg-surface-container-lowest shadow-card md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:overflow-y-auto">
        <div className="flex items-center justify-between gap-sm px-md pt-md md:px-lg md:pt-lg">
          <a href="#/dashboard" className="flex items-center gap-sm rounded-xl">
            <BrandLockup size="sm" />
            <span className="rounded-full bg-surface-container-high px-sm py-0.5 text-xs font-bold text-on-surface">Admin</span>
          </a>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high md:hidden"
          >
            <Icon name="signout" />
          </button>
        </div>

        {/* `relative`, so the visually hidden text inside scrolls with its row
            instead of widening the page. */}
        <nav aria-label="Sections" className="relative overflow-x-auto p-md md:flex-1 md:overflow-visible md:px-md md:py-lg">
          <div className="flex gap-xs md:flex-col md:gap-lg">
            {NAV.map((group) => (
              <div key={group.label ?? 'top'} className="contents md:block">
                {group.label && (
                  <p className="hidden px-md pb-xs text-xs font-semibold text-on-surface-variant md:block">{group.label}</p>
                )}
                <ul className="contents md:flex md:flex-col md:gap-0.5">
                  {group.pages.map((name) => {
                    const current = page === name
                    const waiting = waitingOn(name, overview.data)
                    return (
                      <li key={name} className="shrink-0">
                        <a
                          href={`#/${name}`}
                          aria-current={current ? 'page' : undefined}
                          className={`flex items-center gap-sm whitespace-nowrap rounded-full px-md py-2 text-sm font-semibold transition-colors ${
                            current
                              ? 'bg-inverse-surface text-inverse-on-surface'
                              : 'text-on-surface hover:bg-surface-container'
                          }`}
                        >
                          <Icon name={PAGES[name].icon} className={`h-5 w-5 ${current ? '' : 'text-on-surface-variant'}`} />
                          <span className="md:flex-1">{PAGES[name].label}</span>
                          {waiting > 0 && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-on-secondary">
                              {waiting}
                              <span className="sr-only"> waiting</span>
                            </span>
                          )}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="hidden border-t border-outline-variant/40 p-md md:block">
          <p className="truncate px-sm text-xs text-on-surface-variant" title={session.email}>
            {session.email}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-xs flex w-full items-center gap-sm rounded-full px-sm py-2 text-sm font-semibold text-on-surface hover:bg-surface-container"
          >
            <Icon name="signout" className="h-5 w-5 text-on-surface-variant" />
            Sign out
          </button>
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1 px-md py-lg md:px-xl md:py-xl">
        <div className="mx-auto max-w-5xl">
          <Page api={api} go={go} overview={overview} recount={overview.reload} />
        </div>
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
        <BrandLockup size="md" className="mb-lg" />
        <h1 className="mb-xs text-xl font-bold text-primary">{sent ? 'Enter the code' : 'Admin sign in'}</h1>
        <p className="mb-lg text-sm text-on-surface-variant [text-wrap:pretty]">
          {sent
            ? `If ${email.trim()} is an admin address, a code is on its way.`
            : 'Sign in with an admin email. A six-digit code is sent to it.'}
        </p>
        <Problem error={error} />
        <form onSubmit={submit} className="flex flex-col gap-md">
          {!sent ? (
            <Field label="Email">
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@afrocoils.app"
                className={input}
              />
            </Field>
          ) : (
            <Field label="Six-digit code">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className={`${input} text-center text-lg tracking-[0.4em]`}
              />
            </Field>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Working…' : sent ? 'Sign in' : 'Send code'}
          </Button>
          {sent && (
            <button
              type="button"
              onClick={() => (setSent(false), setCode(''), setError(null))}
              className="text-sm font-semibold text-on-surface-variant underline underline-offset-4"
            >
              Use a different email
            </button>
          )}
        </form>
      </Card>
    </div>
  )
}
