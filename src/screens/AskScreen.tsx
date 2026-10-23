import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AskReplyView, Suggestions } from '../components/AskReplyView'
import Icon from '../components/Icon'
import { EXAMPLES, OPENER, OPENER_SUB, SHARING_LINE } from '../content/ask'
import { ask, type AskReply } from '../lib/ask/engine'
import { shareAsked } from '../lib/ask/share'
import { resolveLocStage } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'

/**
 * Ask, at `/ask?q=…` — a question box over everything the app has written.
 *
 * Not an assistant. The engine in lib/ask finds the record that answers
 * the question and this screen quotes it: the passage word for word, the
 * list beneath it as the list it is, any caution in full, and a button to
 * the page it came from. The only sentences that are not quotes are the
 * fixed lines in content/ask.ts. It answers on the phone and works in
 * aeroplane mode. The question lives in the URL, so back returns to the
 * last answer, and the "Earlier" list is held in memory until the app
 * closes. A question typed here is shared anonymously with the review
 * queue when it is asked (not when back replays it), while sharing is on.
 *
 * The floating Ask button opens the same answers as a sheet; this is
 * the full-screen form that links into Ask (the FAQ, the Styles search
 * field) land on.
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
  const ctx = useMemo(
    () => ({
      identity,
      preferences,
      bio,
      locStage: identity.hairType === 'Locs' ? resolveLocStage(identity).stage : undefined,
    }),
    [identity, preferences, bio],
  )
  const reply = useMemo<AskReply | undefined>(() => (q ? ask(q, ctx) : undefined), [q, ctx])

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
    shareAsked(next, ask(next, ctx), profile.askSharing)
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
          {OPENER}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">{OPENER_SUB}</p>
      </section>

      <form onSubmit={onSubmit} role="search" className="relative mb-lg">
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
          placeholder="Type how your hair feels…"
          className="w-full rounded-full border-none bg-surface-container-lowest py-4 pl-lg pr-16 font-body-md text-body-md text-on-surface shadow-card transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          aria-label="Ask"
          className="absolute right-2 top-[0.375rem] flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary transition-all active:scale-90"
        >
          <Icon name="send" />
        </button>
        {profile.askSharing && (
          <p className="mt-xs text-center font-body-md text-[11px] leading-4 text-on-surface-variant">
            {SHARING_LINE}
          </p>
        )}
      </form>

      {!q && <Suggestions items={examples} onPick={submit} />}

      {q && reply && (
        <section aria-live="polite" className="mb-2xl">
          {/* The question, as asked — so the answer below has something to answer. */}
          <div className="mb-md flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-inverse-surface px-lg py-md font-body-md text-body-md text-inverse-on-surface">
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
