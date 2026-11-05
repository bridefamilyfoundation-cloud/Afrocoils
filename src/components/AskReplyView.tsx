import { Link } from 'react-router-dom'
import Icon from './Icon'
import { COMMUNITY, NONE_DOOR } from '../content/ask'
import type { AskPoints } from '../lib/ask/corpus'
import type { AskForYou, AskHit, AskReply } from '../lib/ask/engine'

/**
 * One reply from Ask, drawn the same way wherever Ask is opened — the
 * full screen at `/ask` and the sheet behind the floating button.
 *
 * Kept deliberately small: a line from Ask, one card, one button. The
 * card is the answer, the steps, any caution, and the lines written for
 * this person's hair; the button goes to the screen where the fix is
 * done. Everything else the app has on the subject is one tap away on
 * that screen rather than stacked up here. A quiet link to the
 * community closes every answer.
 *
 * A question that is not about hair gets one calm line and a few
 * openers to try; one about hair with no written answer gets the Quick
 * Hair Check.
 */

export function Suggestions({
  title,
  items,
  onPick,
  icon,
}: {
  title?: string
  items: string[]
  onPick: (q: string) => void
  icon?: 'history'
}) {
  return (
    <section className="mb-xl">
      {title && (
        <h3 className="mb-sm font-label-md text-caption uppercase tracking-widest text-on-surface-variant">
          {title}
        </h3>
      )}
      <div className="flex flex-wrap gap-sm">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPick(item)}
            className="inline-flex items-center gap-xs rounded-full bg-surface-container-lowest px-md py-2 text-left font-body-md text-caption text-on-surface shadow-card transition-all active:scale-95"
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
        <Bubble>{reply.text}</Bubble>
        <div className="mt-md pl-[44px]">
          {reply.offTopic ? (
            <Suggestions items={examples.slice(0, 3)} onPick={onPick} />
          ) : (
            <PrimaryLink to={NONE_DOOR.to} label={NONE_DOOR.label} />
          )}
        </div>
      </>
    )
  }

  const { hit, mode } = reply
  return (
    <>
      {reply.corrected && (
        <p className="mb-sm font-body-md text-caption text-on-surface-variant">
          Showing results for <span className="font-label-md text-on-surface">“{reply.corrected}”</span>
        </p>
      )}

      {/* Medical before cosmetic: said first, in full, never folded away. */}
      {reply.safety && (
        <p className="mb-md flex items-start gap-sm rounded-xl bg-error-container p-md font-body-md text-caption text-on-error-container">
          <Icon name="warning" className="shrink-0 text-[18px] leading-5" />
          <span>{reply.safety}</span>
        </p>
      )}

      <Bubble>{reply.lead}</Bubble>

      <div className="mt-md">
        {mode === 'styles' ? (
          <StyleList hits={reply.styles} seeAll={reply.seeAll} />
        ) : mode === 'products' && reply.products.length > 0 ? (
          <ProductList reply={reply} />
        ) : (
          <AnswerCard hit={hit} pending={mode === 'pending'} forYou={reply.forYou} />
        )}
      </div>

      {reply.notes.map((note) => (
        <p key={note.text} className="mt-sm font-body-md text-caption text-on-surface-variant">
          {note.text}
          {note.to && (
            <>
              {' '}
              <Link to={note.to} className="text-primary underline">
                {note.label}
              </Link>
            </>
          )}
        </p>
      ))}

      <Link
        to={COMMUNITY.to}
        className="mt-md inline-flex items-center gap-xs font-label-md text-caption text-primary"
      >
        <Icon name="forum" className="text-[16px]" />
        {COMMUNITY.label}
      </Link>
    </>
  )
}

/** Ask's own voice: the fixed lines, never advice. */
function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
        <Icon name="forum" className="text-[18px]" />
      </span>
      <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-container-lowest px-lg py-md font-body-md text-body-md text-on-surface shadow-card">
        {children}
      </p>
    </div>
  )
}

function PrimaryLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-xs rounded-full bg-primary px-lg py-2.5 font-label-md text-label-md text-on-primary transition-all active:scale-95"
    >
      {label}
      <Icon name="arrow_forward" className="text-[18px]" />
    </Link>
  )
}

/** Steps shown from a quoted source; the screen behind the button has the rest. */
const MAX_POINTS = 3

function AnswerCard({
  hit,
  pending,
  forYou,
}: {
  hit: AskHit
  pending: boolean
  forYou: AskForYou[]
}) {
  const { doc, quote } = hit
  // One list, not every list the source has: the card is the answer,
  // and the full page is one tap away.
  const points = doc.points[0]
  return (
    <article className="rounded-2xl bg-surface-container-lowest p-lg shadow-card">
      {doc.kind !== 'answer' && (
        <p className="mb-xs font-label-md text-caption uppercase tracking-widest text-primary">
          {doc.source}
        </p>
      )}
      <h3 className="mb-sm font-headline-md text-body-lg font-bold text-on-surface">{doc.title}</h3>

      {quote && <p className="mb-md font-body-md text-body-md text-on-surface">{quote.text}</p>}

      {doc.caution && (
        <p className="mb-md flex items-start gap-sm rounded-lg bg-secondary-fixed p-sm font-body-md text-caption text-on-surface">
          <Icon name="warning" className="shrink-0 text-[16px] leading-5 text-primary" />
          <span>{doc.caution}</span>
        </p>
      )}

      {points &&
        (pending ? (
          <TopicList points={points} />
        ) : (
          // A written answer's steps exist nowhere else, so all of them
          // show (five at most, by how they are written). A quoted guide
          // shows its first few; the page behind the button has the rest.
          <PointList points={points} onPage={doc.kind !== 'answer'} />
        ))}

      {forYou.length > 0 && (
        <div className="mb-md rounded-xl bg-surface-container p-md">
          <p className="mb-xs flex items-center gap-xs font-label-md text-caption text-primary">
            <Icon name="face_3" className="text-[16px]" />
            For your hair · {forYou.map((f) => f.because).join(' · ')}
          </p>
          {forYou.map((line) => (
            <p key={line.text} className="mt-xs font-body-md text-body-md text-on-surface">
              {line.text}
            </p>
          ))}
        </div>
      )}

      <PrimaryLink to={doc.route} label={doc.cta} />
    </article>
  )
}

function PointList({ points, onPage }: { points: AskPoints; onPage: boolean }) {
  const items = onPage ? points.items.slice(0, MAX_POINTS) : points.items
  const more = points.items.length - items.length
  const avoid = points.tone === 'avoid'
  return (
    <div className="mb-md">
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
    <div className="mb-md flex flex-wrap gap-xs">
      {points.items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-surface-container-high px-md py-1 font-body-md text-caption text-on-surface-variant"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function StyleList({ hits, seeAll }: { hits: AskHit[]; seeAll?: { to: string; label: string } }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest p-md shadow-card">
      <ul className="divide-y divide-outline-variant/30">
        {hits.slice(0, 3).map(({ doc }) => (
          <li key={doc.id}>
            <Link to={doc.route} className="flex items-center gap-md py-md active:opacity-70">
              <span className="min-w-0 flex-1">
                <span className="block font-body-md text-body-md font-bold text-on-surface">
                  {doc.title}
                </span>
                <span className="block font-body-md text-caption text-on-surface-variant">
                  {doc.source}
                </span>
              </span>
              <Icon name="chevron_right" className="shrink-0 text-outline" />
            </Link>
          </li>
        ))}
      </ul>
      {seeAll && (
        <div className="pt-sm">
          <PrimaryLink to={seeAll.to} label={seeAll.label} />
        </div>
      )}
    </div>
  )
}

function ProductList({ reply }: { reply: Extract<AskReply, { type: 'answer' }> }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest p-md shadow-card">
      <ul className="divide-y divide-outline-variant/30">
        {reply.products.map(({ product }) => (
          <li key={product.id} className="py-md">
            <p className="font-body-md text-body-md font-bold text-on-surface">
              {product.brand} {product.name}
            </p>
            <p className="font-body-md text-caption text-on-surface-variant">{product.role}</p>
          </li>
        ))}
      </ul>
      {reply.seeAll && (
        <div className="pt-sm">
          <PrimaryLink to={reply.seeAll.to} label={reply.seeAll.label} />
        </div>
      )}
    </div>
  )
}
