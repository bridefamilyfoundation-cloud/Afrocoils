import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react'
import { AskReplyView, Suggestions } from './AskReplyView'
import Icon from './Icon'
import { EXAMPLES, OPENER, OPENER_SUB, SHARING_LINE } from '../content/ask'
import { ask } from '../lib/ask/engine'
import { shareAsked } from '../lib/ask/share'
import { useBackDismiss } from '../lib/back-button'
import { resolveLocStage } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'

/**
 * The conversation the floating Ask button opens (see AskLauncher).
 * Loaded on first tap, so the engine and every content file it indexes
 * stay out of the bundle the app starts with.
 *
 * The same engine as `/ask` and the same reply card, as a thread rather
 * than one question at a time, so a follow-up ("and for locs?") sits
 * under the answer it follows. Nothing here is generated. The thread
 * lives in memory until the app closes and is never written to the
 * profile; each question, as it is asked, is shared anonymously with
 * the review queue while `askSharing` is on (lib/ask/share.ts), and the
 * line under the box says so every time it is shown.
 *
 * Replies are worked out at render from the question and the *current*
 * profile, so finishing the porosity test and coming back re-fits every
 * answer in the thread to the new result.
 *
 * Following any link in a reply closes the sheet, so the screen it
 * pointed at is what you see — the thread is still there next time.
 */

/** This session's questions, oldest first. In memory only. */
const thread: { id: number; q: string }[] = []
let nextId = 1
const MAX_TURNS = 8

export default function AskSheet({
  open,
  onClose: close,
  opener,
}: {
  open: boolean
  onClose: () => void
  /** The button that opened the sheet, which gets focus back on close. */
  opener: RefObject<HTMLButtonElement | null>
}) {
  const [turns, setTurns] = useState(() => [...thread])
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const latest = useRef<HTMLDivElement>(null)
  useBackDismiss(open, close)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // An empty thread is waiting for a question; one with answers is
    // waiting to be read, and a keyboard over it would hide the answer.
    if (thread.length === 0) input.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      opener.current?.focus({ preventScroll: true })
    }
  }, [open, close, opener])

  // Bring the newest question to the top of the view, so its answer
  // reads from the start rather than from wherever the scroll left off.
  useEffect(() => {
    if (open) latest.current?.scrollIntoView({ block: 'start' })
  }, [turns, open])

  const { profile } = useHairProfile()
  const { identity, preferences, bio } = profile
  const ctx = useMemo(
    () => ({
      identity,
      preferences,
      bio,
      locStage: identity.hairType === 'Locs' ? resolveLocStage(identity).stage : undefined,
    }),
    [identity, preferences, bio],
  )
  const replies = useMemo(() => turns.map((t) => ask(t.q, ctx)), [turns, ctx])
  const examples = EXAMPLES[identity.hairType ?? 'unknown']

  function submit(text: string) {
    const q = text.trim()
    if (!q) {
      input.current?.focus()
      return
    }
    thread.push({ id: nextId++, q })
    shareAsked(q, ask(q, ctx), profile.askSharing)
    if (thread.length > MAX_TURNS) thread.splice(0, thread.length - MAX_TURNS)
    setTurns([...thread])
    setDraft('')
    // Close the keyboard so the answer is visible rather than under it.
    input.current?.blur()
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    submit(draft)
  }

  function clear() {
    thread.length = 0
    setTurns([])
    input.current?.focus()
  }

  return (
    <>
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-[65] bg-inverse-surface/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <section
        inert={!open}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-sheet-title"
        className={`fixed inset-x-0 bottom-0 z-[66] mx-auto flex h-[88vh] max-w-2xl flex-col rounded-t-3xl bg-surface shadow-xl transition-transform duration-200 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <header className="app-chrome flex items-center gap-sm px-lg pb-sm pt-md">
          <h2
            id="ask-sheet-title"
            className="min-w-0 flex-1 font-headline-md text-body-lg font-bold text-on-surface"
          >
            Ask AfroCoils
          </h2>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="rounded-full px-md py-2 font-label-md text-caption text-primary active:scale-95"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close Ask"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container active:scale-90"
          >
            <Icon name="close" className="text-on-surface" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-lg py-md" aria-live="polite">
          {turns.length === 0 ? (
            <div className="flex min-h-full flex-col justify-center pb-2xl">
              <span className="mb-md flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-on-secondary">
                <Icon name="forum" className="text-[28px]" />
              </span>
              <p className="mb-xs font-headline-md text-headline-md font-bold text-on-surface">
                {bio.name ? `${bio.name.trim().split(/\s+/)[0]}, w` : 'W'}
                {OPENER.slice(1)}
              </p>
              <p className="mb-xl font-body-md text-body-md text-on-surface-variant">{OPENER_SUB}</p>
              <Suggestions items={examples} onPick={submit} />
            </div>
          ) : (
            turns.map((turn, i) => (
              <div
                key={turn.id}
                ref={i === turns.length - 1 ? latest : undefined}
                className="mb-2xl scroll-mt-md"
              >
                <div className="mb-md flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-inverse-surface px-lg py-md font-body-md text-body-md text-inverse-on-surface">
                    {turn.q}
                  </p>
                </div>
                <AskReplyView reply={replies[i]} onPick={submit} examples={examples} />
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={onSubmit}
          role="search"
          className="app-chrome relative px-lg pb-[calc(0.5rem+var(--safe-bottom))] pt-sm"
        >
          <label htmlFor="ask-sheet-input" className="sr-only">
            Your question
          </label>
          <input
            id="ask-sheet-input"
            ref={input}
            type="search"
            enterKeyHint="send"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={160}
            placeholder={turns.length ? 'Ask a follow-up…' : 'Type how your hair feels…'}
            className="w-full rounded-full border-none bg-surface-container-lowest py-4 pl-lg pr-16 font-body-md text-body-md text-on-surface shadow-card placeholder:text-outline focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            aria-label="Ask"
            className="absolute right-xl top-[0.875rem] flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary transition-all active:scale-90"
          >
            <Icon name="send" />
          </button>
          {profile.askSharing && (
            <p className="mt-xs text-center font-body-md text-[11px] leading-4 text-on-surface-variant">
              {SHARING_LINE}
            </p>
          )}
        </form>
      </section>
    </>
  )
}
