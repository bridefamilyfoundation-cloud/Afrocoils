import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AskReplyView, Suggestions } from '../components/AskReplyView'
import Icon from '../components/Icon'
import { EXAMPLES } from '../content/ask'
import { ask, type AskReply } from '../lib/ask/engine'
import { resolveLocStage } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'

/**
 * Ask, at `/ask?q=…` — a question box over everything the app has written.
 *
 * Not an assistant. The engine in lib/ask finds the record that answers
 * the question and this screen quotes it: the passage word for word, the
 * list beneath it as the list it is, any caution in full, and a button to
 * the page it came from. The only sentences that are not quotes are the
 * fixed lines in content/ask.ts. It runs on the phone, works in
 * aeroplane mode, and keeps nothing: the question lives in the URL, so
 * back returns to the last answer, and the "Earlier" list is held in
 * memory until the app closes.
 *
 * Reached from the app bar on every screen, not from the drawer or the
 * tab bar: it is a way into the six sections, not a seventh.
 */

/** This session's questions, newest first. In memory only — never written to the profile. */
const earlier: string[] = []

function remember(q: string) {
  const i = earlier.findIndex((e) => e.toLowerCase() === q.toLowerCase())
  if (i >= 0) earlier.splice(i, 1)
  earlier.unshift(q)
  earlier.length = Math.min(earlier.length, 6)
}

export default function AskScreen() {
  const { profile } = useHairProfile()
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const [draft, setDraft] = useState(q)
  const input = useRef<HTMLInputElement>(null)

  // Back and forward change the question; the box follows.
  useEffect(() => setDraft(q), [q])

  const { identity, preferences, bio } = profile
  const reply = useMemo<AskReply | undefined>(() => {
    if (!q) return undefined
    const locStage = identity.hairType === 'Locs' ? resolveLocStage(identity).stage : undefined
    return ask(q, { identity, preferences, locStage, bio })
  }, [q, identity, preferences, bio])

  useEffect(() => {
    if (q) remember(q)
  }, [q])

  function submit(text: string) {
    const next = text.trim()
    if (!next) {
      input.current?.focus()
      return
    }
    setParams({ q: next })
    // Close the keyboard so the answer is visible rather than under it.
    input.current?.blur()
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    submit(draft)
  }

  const examples = EXAMPLES[identity.hairType ?? 'unknown']
  const previous = earlier.filter((e) => e !== q)

  return (
    <>
      <section className="mb-lg">
        <h2 className="mb-xs font-headline-lg text-headline-lg-mobile text-on-background">
          Ask AfroCoils
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Describe what’s going on, or what you want to do. Every answer was written by people
          for AfroCoils, fitted to your hair profile, on your phone.
        </p>
      </section>

      <form onSubmit={onSubmit} role="search" className="relative mb-xl">
        <label htmlFor="ask-input" className="sr-only">
          Your question
        </label>
        <input
          id="ask-input"
          ref={input}
          type="search"
          enterKeyHint="send"
          autoComplete="off"
          // A blank screen is waiting for a question; an answer is not.
          autoFocus={!q}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={160}
          placeholder="e.g. my ends keep breaking"
          className="w-full rounded-full border-none bg-surface-container-low py-4 pl-lg pr-16 font-body-md text-body-md text-on-surface shadow-sm transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          aria-label="Ask"
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary-container text-on-primary-container transition-all active:scale-90"
        >
          <Icon name="send" />
        </button>
      </form>

      {!q && (
        <>
          <Suggestions title="Try asking" items={examples} onPick={submit} />
          <p className="mb-2xl flex items-start gap-sm rounded-xl bg-surface-container p-md font-body-md text-caption text-on-surface-variant">
            <Icon name="info" className="shrink-0 text-[16px] leading-4 text-primary" />
            <span>
              Ask isn’t AI and doesn’t make advice up. It finds the answer AfroCoils has
              written for your question, shows the lines written for your kind of hair, and
              links to where you fix it. Nothing you type is saved or sent anywhere, and it
              works with no signal.
            </span>
          </p>
        </>
      )}

      {q && reply && (
        <section aria-live="polite" className="mb-2xl">
          {/* The question, as asked — so the answer below has something to answer. */}
          <div className="mb-md flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-tertiary-container px-lg py-md font-body-md text-body-md text-on-tertiary-container">
              {q}
            </p>
          </div>

          <AskReplyView reply={reply} onPick={submit} examples={examples} />
        </section>
      )}

      {previous.length > 0 && (
        <Suggestions title="Earlier" items={previous} onPick={submit} icon="history" />
      )}
    </>
  )
}
