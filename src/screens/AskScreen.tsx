import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { EXAMPLES } from '../content/ask'
import type { AskPoints } from '../lib/ask/corpus'
import { ask, type AskHit, type AskReply } from '../lib/ask/engine'
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

  const { identity, preferences } = profile
  const reply = useMemo<AskReply | undefined>(() => {
    if (!q) return undefined
    const locStage = identity.hairType === 'Locs' ? resolveLocStage(identity).stage : undefined
    return ask(q, { identity, preferences, locStage })
  }, [q, identity, preferences])

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
          Ask Afrocoil
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Describe what’s going on, or what you want to do. Answers are quoted from the app’s own
          guides, on your phone.
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
              Ask doesn’t write advice. It finds the part of Afrocoil that answers you and
              quotes it word for word, with a link to the page. Nothing you type is saved or
              sent anywhere, and it works with no signal.
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

          <Answer reply={reply} onPick={submit} examples={examples} />
        </section>
      )}

      {previous.length > 0 && (
        <Suggestions title="Earlier" items={previous} onPick={submit} icon="history" />
      )}
    </>
  )
}

function Suggestions({
  title,
  items,
  onPick,
  icon,
}: {
  title: string
  items: string[]
  onPick: (q: string) => void
  icon?: 'history'
}) {
  return (
    <section className="mb-xl">
      <h3 className="mb-sm font-headline-md text-body-lg font-bold text-on-surface">
        {title}
      </h3>
      <div className="flex flex-wrap gap-sm">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPick(item)}
            className="inline-flex items-center gap-xs rounded-full border border-outline-variant bg-surface-container-lowest px-md py-2 text-left font-body-md text-caption text-on-surface transition-all active:scale-95"
          >
            {icon && <Icon name={icon} className="text-[16px] text-outline" />}
            {item}
          </button>
        ))}
      </div>
    </section>
  )
}

function Answer({
  reply,
  onPick,
  examples,
}: {
  reply: AskReply
  onPick: (q: string) => void
  examples: string[]
}) {
  if (reply.type === 'chat') return <Bubble>{reply.text}</Bubble>

  if (reply.type === 'none') {
    return (
      <>
        {reply.corrected && <Corrected text={reply.corrected} />}
        <Bubble>{reply.text}</Bubble>
        <div className="mt-lg">
          <Suggestions title="Try one of these" items={examples} onPick={onPick} />
        </div>
        <div className="flex flex-wrap gap-sm">
          <Chip to="/faq" label="Read the FAQ" />
          <Chip to="/legal/contact" label="Contact the people who make it" />
        </div>
      </>
    )
  }

  const { hit, mode } = reply
  return (
    <>
      {reply.corrected && <Corrected text={reply.corrected} />}

      {/* Medical before cosmetic: said first, in full, never folded away. */}
      {reply.safety && (
        <p className="mb-md flex items-start gap-sm rounded-xl bg-error-container p-md font-body-md text-body-md text-on-error-container">
          <Icon name="warning" className="shrink-0 leading-6" />
          <span>{reply.safety}</span>
        </p>
      )}

      <Bubble>{reply.lead}</Bubble>

      <div className="mt-md">
        {mode === 'styles' ? (
          <StyleList hits={reply.styles} />
        ) : mode === 'products' ? (
          <ProductList reply={reply} />
        ) : (
          <QuoteCard hit={hit} pending={mode === 'pending'} />
        )}

        {reply.seeAll && (
          <Link
            to={reply.seeAll.to}
            className="mt-md flex items-center justify-center gap-xs rounded-full bg-primary-container px-lg py-3 font-label-md text-label-md text-on-primary-container transition-all active:scale-95"
          >
            {reply.seeAll.label}
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        )}
      </div>

      {reply.notes.map((note) => (
        <p
          key={note.text}
          className="mt-md flex items-start gap-sm rounded-xl bg-surface-container p-md font-body-md text-caption text-on-surface-variant"
        >
          <Icon name="info" className="shrink-0 text-[16px] leading-4 text-primary" />
          <span>
            {note.text}
            {note.to && (
              <>
                {' '}
                <Link to={note.to} className="text-primary underline">
                  {note.label}
                </Link>
              </>
            )}
          </span>
        </p>
      ))}

      {reply.answeredFor && (
        <p className="mt-md font-body-md text-caption text-on-surface-variant">
          Answered for {reply.answeredFor.hairType === 'Locs' ? 'locs' : 'loose natural hair'}
          {reply.answeredFor.from === 'question' ? ', as you asked.' : ', from your profile.'}
        </p>
      )}

      {reply.related.length > 0 && <Related hits={reply.related} />}
    </>
  )
}

/** Ask's own voice: the fixed lines, never advice. */
function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
        <Icon name="forum" className="text-[18px]" />
      </span>
      <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-container px-lg py-md font-body-md text-body-md text-on-surface">
        {children}
      </p>
    </div>
  )
}

function Corrected({ text }: { text: string }) {
  return (
    <p className="mb-sm font-body-md text-caption text-on-surface-variant">
      Showing results for <span className="font-label-md text-on-surface">“{text}”</span>
    </p>
  )
}

function QuoteCard({ hit, pending }: { hit: AskHit; pending: boolean }) {
  const { doc, quote } = hit
  return (
    <article className="overflow-hidden rounded-xl shadow-card bg-surface-container-lowest p-lg">
      <p className="mb-xs font-label-md text-caption uppercase tracking-widest text-primary">
        {doc.source}
      </p>
      <h3 className="mb-md font-headline-md text-body-lg text-on-surface">{doc.title}</h3>

      {quote && (
        <blockquote className="mb-lg border-l-4 border-primary-container pl-md">
          {quote.label && (
            <p className="mb-xs font-label-md text-caption text-on-surface-variant">
              {quote.label}
            </p>
          )}
          <p className="font-body-md text-body-md text-on-surface">{quote.text}</p>
        </blockquote>
      )}

      {doc.caution && (
        <p className="mb-lg flex items-start gap-sm rounded-lg bg-secondary-fixed p-md font-body-md text-caption text-on-surface">
          <Icon name="warning" className="shrink-0 text-[16px] leading-5 text-primary" />
          <span>{doc.caution}</span>
        </p>
      )}

      {doc.points.map((points) =>
        pending ? (
          <TopicList key={points.label} points={points} />
        ) : (
          <PointList key={points.label} points={points} />
        ),
      )}

      <div className="mt-md flex flex-wrap gap-sm">
        <Link
          to={doc.route}
          className="inline-flex items-center gap-xs rounded-full bg-primary px-lg py-2 font-label-md text-label-md text-on-primary transition-all active:scale-95"
        >
          {doc.cta}
          <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
        {doc.more && <Chip to={doc.more.to} label={doc.more.label} />}
      </div>
    </article>
  )
}

/** Shown in full up to five; past that the page it links to has the rest. */
const MAX_POINTS = 5

function PointList({ points }: { points: AskPoints }) {
  const items = points.items.slice(0, MAX_POINTS)
  const more = points.items.length - items.length
  const avoid = points.tone === 'avoid'
  return (
    <div className="mb-md">
      <h4 className="mb-sm font-label-md text-caption uppercase tracking-widest text-on-surface-variant">
        {points.label}
      </h4>
      <ul className="space-y-xs">
        {items.map((item, i) => (
          <li
            key={item}
            className="flex items-start gap-sm font-body-md text-body-md text-on-surface-variant"
          >
            {points.ordered ? (
              <span className="w-5 shrink-0 font-label-md text-caption leading-6 text-primary">
                {i + 1}
              </span>
            ) : (
              // A tick beside "petroleum-heavy products" would read as an
              // instruction to use them; things to avoid get a struck mark.
              <Icon
                name={avoid ? 'block' : 'check'}
                className={`shrink-0 text-[16px] leading-6 ${avoid ? 'text-error' : 'text-primary'}`}
              />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className="mt-xs pl-lg font-body-md text-caption text-on-surface-variant">
          and {more} more on the page
        </p>
      )}
    </div>
  )
}

/** An unwritten section's topics: grey chips, the same as Locs World draws them. */
function TopicList({ points }: { points: AskPoints }) {
  return (
    <div className="mb-md">
      <h4 className="mb-sm font-label-md text-caption uppercase tracking-widest text-on-surface-variant">
        {points.label}
      </h4>
      <div className="flex flex-wrap gap-xs">
        {points.items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-surface-container-high px-md py-1 font-body-md text-caption text-on-surface-variant"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function StyleList({ hits }: { hits: AskHit[] }) {
  return (
    <ul className="space-y-sm">
      {hits.map(({ doc, quote }) => (
        <li key={doc.id}>
          <Link
            to={doc.route}
            className="flex items-center gap-md rounded-xl shadow-card bg-surface-container-lowest p-md transition-all active:scale-[0.98]"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-headline-md text-body-lg text-on-surface">
                {doc.title}
              </span>
              <span className="block font-label-md text-caption text-primary">{doc.source}</span>
              {quote && (
                <span className="mt-xs line-clamp-2 block font-body-md text-caption text-on-surface-variant">
                  {quote.text}
                </span>
              )}
            </span>
            <Icon name="chevron_right" className="shrink-0 text-outline" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ProductList({ reply }: { reply: Extract<AskReply, { type: 'answer' }> }) {
  if (reply.products.length === 0) {
    return <QuoteCard hit={reply.hit} pending={false} />
  }
  return (
    <ul className="space-y-sm">
      {reply.products.map(({ product }) => (
        <li
          key={product.id}
          className="rounded-xl shadow-card bg-surface-container-lowest p-md"
        >
          <p className="font-label-md text-caption uppercase tracking-widest text-primary">
            {product.brand} · {product.price}
          </p>
          <p className="font-headline-md text-body-lg text-on-surface">{product.name}</p>
          <p className="font-body-md text-caption text-on-surface-variant">{product.role}</p>
        </li>
      ))}
    </ul>
  )
}

function Related({ hits }: { hits: AskHit[] }) {
  return (
    <section className="mt-xl">
      <h3 className="mb-sm font-headline-md text-body-lg font-bold text-on-surface">
        Also in the app
      </h3>
      <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded-xl shadow-card bg-surface-container-lowest">
        {hits.map(({ doc }) => (
          <li key={doc.id}>
            <Link to={doc.route} className="flex items-center gap-md p-md active:bg-surface-container">
              <span className="min-w-0 flex-1">
                <span className="block font-body-md text-body-md text-on-surface">{doc.title}</span>
                <span className="block font-body-md text-caption text-on-surface-variant">
                  {doc.source}
                </span>
              </span>
              <Icon name="chevron_right" className="shrink-0 text-outline" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Chip({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-xs rounded-full border border-outline-variant px-md py-2 font-label-md text-caption text-on-surface transition-all active:scale-95"
    >
      {label}
      <Icon name="chevron_right" className="text-[16px]" />
    </Link>
  )
}
