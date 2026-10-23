import { Link } from 'react-router-dom'
import Icon from './Icon'
import { COMMUNITY, DOORS } from '../content/ask'
import type { AskPoints } from '../lib/ask/corpus'
import type { AskForYou, AskHit, AskReply } from '../lib/ask/engine'

/**
 * One reply from Ask, drawn the same way wherever Ask is opened — the
 * full screen at `/ask` and the popup behind the floating button.
 *
 * Every reply ends somewhere you can act: the answer's own button to the
 * screen where the fix is done, and beneath it the community. A
 * question nothing answers is sent to the Quick Hair Check, Hair Care
 * and the style library rather than left at "not found".
 */

export function Suggestions({
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

export function AskReplyView({
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
        <Doors />
        <div className="mt-lg">
          <Suggestions title="Or try one of these" items={examples} onPick={onPick} />
        </div>
        <Community />
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

      {reply.forYou.length > 0 && <ForYouCard lines={reply.forYou} />}

      {reply.answeredFor && (
        <p className="mt-md font-body-md text-caption text-on-surface-variant">
          Answered for {reply.answeredFor.hairType === 'Locs' ? 'locs' : 'loose natural hair'}
          {reply.answeredFor.from === 'question' ? ', as you asked.' : ', from your profile.'}
        </p>
      )}

      {reply.related.length > 0 && <Related hits={reply.related} />}

      <Community />
    </>
  )
}

/** Lines written for this person's kind of hair, and what on the profile chose each one. */
function ForYouCard({ lines }: { lines: AskForYou[] }) {
  return (
    <section className="mt-md rounded-xl bg-secondary-fixed p-lg">
      <h3 className="mb-sm flex items-center gap-xs font-label-md text-caption uppercase tracking-widest text-primary">
        <Icon name="face_3" className="text-[16px]" />
        For your hair
      </h3>
      <ul className="space-y-md">
        {lines.map((line) => (
          <li key={line.text}>
            <p className="font-body-md text-body-md text-on-surface">{line.text}</p>
            <p className="mt-xs font-body-md text-caption text-on-surface-variant">
              From your profile: {line.because}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Where to start when nothing is written for the question. */
function Doors() {
  return (
    <div className="mt-md grid grid-cols-3 gap-sm">
      {DOORS.map((door) => (
        <Link
          key={door.to}
          to={door.to}
          className="flex flex-col items-center gap-xs rounded-xl bg-surface-container-lowest p-md text-center shadow-card transition-all active:scale-95"
        >
          <Icon name={door.icon} className="text-primary" />
          <span className="font-label-md text-caption text-on-surface">{door.label}</span>
        </Link>
      ))}
    </div>
  )
}

/** The foot of every reply: the community the app actually has. */
function Community() {
  return (
    <section className="mt-xl rounded-xl bg-inverse-surface p-lg text-inverse-on-surface">
      <h3 className="mb-xs flex items-center gap-xs font-headline-md text-body-lg font-bold">
        <Icon name="forum" className="text-[18px]" />
        {COMMUNITY.title}
      </h3>
      <p className="mb-md font-body-md text-caption opacity-90">{COMMUNITY.text}</p>
      <div className="flex flex-wrap gap-sm">
        {COMMUNITY.links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="inline-flex items-center gap-xs rounded-full bg-secondary px-md py-2 font-label-md text-caption font-bold text-on-secondary transition-all active:scale-95"
          >
            {link.label}
            <Icon name="chevron_right" className="text-[16px]" />
          </Link>
        ))}
      </div>
    </section>
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
