import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hasLocLook, slot as imageSlot } from '../assets/imagery'
import Icon from '../components/Icon'
import LocsMasthead from '../components/LocsMasthead'
import { PlusBadge, PlusCard } from '../components/Plus'
import PrototypeImage from '../components/PrototypeImage'
import { LOC_CARE, outlineCount, type LocBlock } from '../content/loc-care'
import { LOC_STYLES } from '../content/loc-styles'
import { useOpenParam, useScrollToOpened } from '../lib/deep-link'
import { isLocs, resolveLocStage } from '../lib/locs'
import { locChapterFree, usePlus } from '../lib/plus'
import { useHairProfile } from '../lib/profile-store'
import { LOC_STAGES, type HairIdentity, type HairType } from '../lib/types'

/**
 * Locs World, at `/locs`. A section of its own, not a chapter of Hair Care.
 *
 * Sixteen chapters, one open at a time. A loc wearer arrives knowing
 * which one they want — buildup, a weak root, what to do before
 * swimming — so the closed list is the useful default and the whole
 * reference stays one screen rather than sixteen routes.
 *
 * Written sections render as advice. Topic-list sections render as chips
 * and say so once, at the top. The distinction is the point: see the
 * header comment in content/loc-care.ts for why the app does not dress
 * an unwritten heading up as an answer.
 *
 * Shown to everyone, not only to loc wearers — "Are locs right for you?"
 * is a question you ask before you have them. What changes with the
 * profile is the line under the title, the journey strip under that,
 * and whether `/sos` offers a card pointing here.
 *
 * It wears the espresso of `LocsMasthead` rather than the cream of the
 * rest of the app, so arriving here feels like arriving somewhere.
 */

/**
 * The five stages as a strand, with the wearer's own lit. Stage is the
 * thing that changes the advice most, so it is the first fact shown —
 * and labelled as an estimate when it came from the start date, because
 * the wearer can see their hair and the app cannot.
 */
function StageStrip({ identity }: { identity: HairIdentity }) {
  const { stage, estimated } = resolveLocStage(identity)
  const at = stage ? LOC_STAGES.indexOf(stage) : -1
  return (
    <div className="mt-lg rounded-2xl bg-inverse-on-surface/10 p-md">
      <ol className="relative flex justify-between">
        <span
          aria-hidden
          className="absolute left-2 right-2 top-[9px] h-0.5 bg-inverse-on-surface/20"
        />
        {LOC_STAGES.map((s, i) => (
          <li key={s} className="relative flex flex-col items-center gap-xs">
            <span
              aria-hidden
              className={`h-5 w-5 rounded-full border-2 ${
                i === at
                  ? 'border-secondary bg-secondary ring-4 ring-secondary/30'
                  : i < at
                    ? 'border-inverse-primary bg-inverse-primary'
                    : 'border-inverse-on-surface/40 bg-inverse-surface'
              }`}
            />
            <span
              className={`font-caption text-caption ${
                i === at ? 'font-semibold text-inverse-on-surface' : 'text-inverse-on-surface/70'
              }`}
            >
              {s}
              {i === at && <span className="sr-only"> (your stage)</span>}
            </span>
          </li>
        ))}
      </ol>
      <Link
        to="/profile"
        className="mt-sm flex items-center gap-xs font-caption text-caption text-inverse-primary"
      >
        {stage
          ? `${stage} stage${estimated ? ', estimated from your start date' : ''}`
          : 'Add your start date to see your stage'}
        <Icon name="chevron_right" className="text-[14px]" />
      </Link>
    </div>
  )
}

/**
 * The first question, asked at the top of Locs World: loose or loc'd.
 * The copy is the owner's, word for word — nothing else is written above
 * the lookbook. Choosing writes `identity.hairType` exactly as the
 * profile's picker does (never cleared by a second tap), so it stays the
 * same field rather than a third copy of the profile's pickers. Loose
 * hair is then sent to Hair Care, since Locs World is not written for it.
 */
const FIRST_QUESTION: { type: HairType; title: string; body: string; icon: 'waves' | 'grass' }[] = [
  {
    type: 'Loose Natural',
    title: 'Loose Natural Hair',
    body: 'Personalised care and styling for your natural coils, curls, and kinks.',
    icon: 'waves',
  },
  {
    type: 'Locs',
    title: 'Loc’d Hair',
    body: 'Personalised care and styling for your locs, from starter locs to mature locs.',
    icon: 'grass',
  },
]

function FirstQuestion() {
  const { profile, update } = useHairProfile()
  const navigate = useNavigate()
  const current = profile.identity.hairType

  function choose(type: HairType) {
    if (current !== type) update({ identity: { ...profile.identity, hairType: type } })
    if (type === 'Loose Natural') navigate('/care')
  }

  return (
    <div className="mt-lg grid grid-cols-1 gap-sm sm:grid-cols-2">
      {FIRST_QUESTION.map(({ type, title, body, icon }) => {
        const selected = current === type
        return (
          <button
            key={type}
            type="button"
            aria-pressed={selected}
            onClick={() => choose(type)}
            className={`flex flex-col rounded-2xl p-md text-left transition-all active:scale-[0.98] ${
              selected
                ? 'bg-secondary text-on-secondary'
                : 'bg-inverse-on-surface/10 text-inverse-on-surface'
            }`}
          >
            <span className="mb-xs flex items-center gap-sm">
              <Icon name={icon} filled={selected} />
              <span className="font-headline-md text-body-lg font-bold">{title}</span>
            </span>
            <span
              className={`font-body-md text-caption ${
                selected ? 'opacity-90' : 'text-inverse-on-surface/80'
              }`}
            >
              {body}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Three pictured looks and the way in. The lookbook is the one part of
 * Locs World that is pictures rather than reading, so its door shows some.
 */
function LookbookDoor() {
  const preview = LOC_STYLES.filter((s) => hasLocLook(s.id)).slice(0, 3)
  const corner = ['rounded-l-[1.25rem] rounded-r-md', 'rounded-md', 'rounded-r-[1.25rem] rounded-l-md']
  return (
    <Link
      to="/locs/styles"
      className="mb-xl block overflow-hidden rounded-[1.75rem] bg-surface-container-lowest p-sm ring-1 ring-outline-variant/40 transition-all active:scale-[0.98]"
    >
      {preview.length > 0 && (
        <span className="grid grid-cols-3 gap-xs">
          {preview.map((style, i) => (
            <PrototypeImage
              key={style.id}
              // The middle one from behind: the back is where loc styles happen.
              slot={imageSlot(`loc-style-${style.id}-${i === 1 ? 'back' : 'front'}`, style.name)}
              seed={style.id}
              rounded={corner[i]}
              ratio={[4, 5]}
              className="aspect-[4/5] w-full"
            />
          ))}
        </span>
      )}
      <span className="flex items-center gap-md px-sm pb-xs pt-md">
        <span className="min-w-0 flex-1">
          <span className="block font-headline-md text-body-lg text-on-surface">
            The Loc Lookbook
          </span>
          <span className="block font-body-md text-caption text-on-surface-variant">
            {LOC_STYLES.length} looks, front, back and side — from starter locs to updos
          </span>
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary text-on-tertiary">
          <Icon name="arrow_forward" />
        </span>
      </span>
    </Link>
  )
}

function Block({ block }: { block: LocBlock }) {
  const List = block.ordered ? 'ol' : 'ul'
  return (
    <div className="mb-md last:mb-0">
      {block.label && (
        <h5 className="mb-sm font-label-md text-caption uppercase tracking-widest text-primary">
          {block.label}
        </h5>
      )}
      <List className="space-y-xs">
        {block.items.map((item, i) => (
          <li
            key={item}
            className="flex items-start gap-sm font-body-md text-body-md text-on-surface-variant"
          >
            {block.ordered ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container font-label-md text-caption text-on-secondary-container">
                {i + 1}
              </span>
            ) : (
              // leading-6 matches body-md's line box, so the marker stays on
              // the first line of an item that wraps. An `avoid` block gets
              // its own glyph: a tick beside "heavy waxes" would read as an
              // instruction to use them.
              <Icon
                name={block.tone === 'avoid' ? 'block' : 'check'}
                className={`shrink-0 text-[16px] leading-6 ${
                  block.tone === 'avoid' ? 'text-error' : 'text-primary'
                }`}
              />
            )}
            <span>{item}</span>
          </li>
        ))}
      </List>
    </div>
  )
}

/**
 * A Plus chapter before it is unlocked: every section heading, so the
 * reader can see what the chapter covers, and the first two lines of the
 * first section, so they can see how it is written. Then the way in.
 */
function LockedChapter({ chapter }: { chapter: (typeof LOC_CARE)[number] }) {
  const [first, ...rest] = chapter.sections
  const opening = first.blocks[0]
  return (
    <>
      <h4 className="mb-xs font-headline-md text-body-lg text-on-surface">{first.heading}</h4>
      <div className="relative mb-md max-h-32 overflow-hidden">
        <Block block={{ ...opening, items: opening.items.slice(0, 2) }} />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface-container-lowest" />
      </div>
      {rest.length > 0 && (
        <>
          <p className="mb-xs font-label-md text-caption uppercase tracking-widest text-on-surface-variant">
            Also in this chapter
          </p>
          <ul className="mb-md flex flex-wrap gap-xs">
            {rest.map((section) => (
              <li
                key={section.heading}
                className="rounded-full bg-surface-container px-md py-1 font-body-md text-caption text-on-surface-variant"
              >
                {section.heading}
              </li>
            ))}
          </ul>
        </>
      )}
      <PlusCard
        trigger="locs"
        title="The rest of this chapter is in Plus"
        body="One payment unlocks every chapter, for good."
      />
    </>
  )
}

/** Topics a written guide will cover. Chips, so they cannot read as advice. */
function TopicChips({ blocks }: { blocks: LocBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <div key={block.label ?? 'topics'} className="mb-md last:mb-0">
          {block.label && (
            <h5 className="mb-sm font-label-md text-caption uppercase tracking-widest text-on-surface-variant">
              {block.label}
            </h5>
          )}
          <ul className="flex flex-wrap gap-xs">
            {block.items.map((item) => (
              <li
                key={item}
                className="rounded-full bg-surface-container px-md py-1 font-body-md text-caption text-on-surface-variant"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

export default function LocCareScreen() {
  const { profile } = useHairProfile()
  // `?open=<chapter id>` opens a chapter and scrolls to it: Ask lands here.
  const requested = useOpenParam()
  const shown = requested && LOC_CARE.some((c) => c.id === requested) ? requested : null
  const [open, setOpen] = useState<string | null>(shown)
  useScrollToOpened(shown ? `loc-row-${shown}` : null)
  const locs = isLocs(profile.identity)
  const pending = outlineCount()
  const { unlocked } = usePlus()

  return (
    <>
      <LocsMasthead kicker="The first question" title="Loose or Loc’d?" tourId="locs-heading">
        <p className="mb-sm font-headline-md text-body-lg text-inverse-on-surface">
          Your journey, your care.
        </p>
        <p className="max-w-[40ch] font-body-md text-body-md text-inverse-on-surface/85">
          Different journeys, different needs. Choose yours to receive hair-care guidance and
          recommendations tailored to you.
        </p>
        <FirstQuestion />
        {locs && <StageStrip identity={profile.identity} />}
      </LocsMasthead>

      <LookbookDoor />

      {/* Said once, here, rather than on every unwritten section. The app
          does not pretend a heading is an answer. Every section is written
          today, so this only returns if a new outline is added. */}
      {pending > 0 && (
        <p className="mb-xl flex items-start gap-sm rounded-xl bg-surface-container p-md font-body-md text-caption text-on-surface-variant">
          <Icon name="info" className="shrink-0 text-[16px] leading-4 text-primary" />
          <span>
            {pending} sections below are still topic lists, shown as grey chips — the written
            guides for them are on the way. Everything shown as a checked list is written and
            ready to use.
          </span>
        </p>
      )}

      <section className="mb-2xl space-y-sm">
        <h3 className="mb-md flex items-center gap-sm font-label-md text-caption uppercase tracking-[0.2em] text-on-surface-variant">
          <span aria-hidden className="h-px w-6 bg-secondary" />
          The chapters
        </h3>
        {LOC_CARE.map((chapter, index) => {
          const isOpen = open === chapter.id
          const locked = !unlocked && !locChapterFree(chapter.id)
          return (
            <article
              key={chapter.id}
              id={`loc-row-${chapter.id}`}
              className={`scroll-mt-24 overflow-hidden rounded-2xl border-l-4 bg-surface-container-lowest transition-colors ${
                isOpen ? 'border-secondary' : 'border-tertiary'
              }`}
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`loc-${chapter.id}`}
                  onClick={() => setOpen(isOpen ? null : chapter.id)}
                  className="flex w-full items-center gap-md p-lg text-left transition-colors active:scale-[0.99]"
                >
                  <span
                    aria-hidden
                    className="w-9 shrink-0 font-display-lg text-headline-md leading-none text-primary/80"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-sm font-headline-md text-body-lg text-on-surface">
                      {chapter.title}
                      {locked && <PlusBadge />}
                    </span>
                    <span className="font-body-md text-caption text-on-surface-variant">
                      {chapter.sections.length} section
                      {chapter.sections.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <Icon
                    name={isOpen ? 'expand_less' : 'expand_more'}
                    className="shrink-0 text-outline"
                  />
                </button>
              </h3>

              <div id={`loc-${chapter.id}`} hidden={!isOpen} className="px-lg pb-lg">
                {locked ? (
                  <LockedChapter chapter={chapter} />
                ) : (
                chapter.sections.map((section) => (
                  <div key={section.heading} className="mb-lg last:mb-0">
                    <h4 className="mb-xs font-headline-md text-body-lg text-on-surface">
                      {section.heading}
                    </h4>
                    {section.note && (
                      <p className="mb-sm font-body-md text-caption text-on-surface-variant">
                        {section.note}
                      </p>
                    )}
                    {section.outline ? (
                      <TopicChips blocks={section.blocks} />
                    ) : (
                      section.blocks.map((block) => (
                        <Block key={block.label ?? block.items[0]} block={block} />
                      ))
                    )}
                  </div>
                ))
                )}
              </div>
            </article>
          )
        })}
      </section>

      {/* The two screens this one keeps pointing at. Loc stage, retwist
          cadence and the calendar's default schedule are already derived
          from the profile, so the reference should hand you to them
          rather than describe them a second time. */}
      <section className="mb-2xl grid grid-cols-1 gap-sm sm:grid-cols-2">
        <Link
          to="/calendar"
          className="flex items-center gap-md rounded-xl shadow-card bg-surface-container-lowest p-lg transition-all active:scale-[0.98]"
        >
          <Icon name="calendar_month" className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1 font-body-md text-body-md text-on-surface">
            Put your retwist and wash days on a schedule
          </span>
          <Icon name="arrow_forward" className="shrink-0 text-outline" />
        </Link>
        <Link
          to="/sos/problem"
          className="flex items-center gap-md rounded-xl shadow-card bg-surface-container-lowest p-lg transition-all active:scale-[0.98]"
        >
          <Icon name="warning" className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1 font-body-md text-body-md text-on-surface">
            Something is wrong right now
          </span>
          <Icon name="arrow_forward" className="shrink-0 text-outline" />
        </Link>
      </section>
    </>
  )
}
