import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CoilPatternArt, StrandArt } from '../components/HairIllustrations'
import Icon from '../components/Icon'
import SectionCrumb from '../components/SectionCrumb'
import {
  HAIR_GUIDE,
  HAIR_GUIDE_INTRO,
  HAIR_GUIDE_START,
  HAIR_GUIDE_TAGLINE,
  HAIR_GUIDE_TITLE,
  hairGuideFor,
  type HairGuideBlock,
} from '../content/hair-guide'
import { useOpenParam, useScrollToOpened } from '../lib/deep-link'
import { isLocs } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'
import { CURL_PATTERNS } from '../lib/types'

/**
 * The AfroCoils Hair Guide, at `/care/guide`. Inside Hair Care, reached
 * from its hub, so it carries a crumb back there rather than a drawer
 * entry of its own.
 *
 * Chapters, one open at a time, the same shape as Locs World: the guide
 * is sixteen chapters long and someone arrives wanting one of them.
 * `?open=<chapter id>` opens and scrolls to it, which is how Ask lands.
 *
 * Loose-hair chapters (detangling, combing, restyling) are left out for
 * a loc wearer, as every other list in the app does, with a line saying
 * so and pointing at Locs World — never quietly.
 */

function Block({ block }: { block: HairGuideBlock }) {
  switch (block.kind) {
    case 'text':
      return <p className="font-body-md text-body-md text-on-surface-variant">{block.text}</p>

    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'
      return (
        <List className="space-y-xs">
          {block.items.map((item, i) => (
            <li key={item} className="flex items-start gap-sm font-body-md text-body-md text-on-surface-variant">
              {block.ordered ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container font-label-md text-caption text-on-secondary-container">
                  {i + 1}
                </span>
              ) : (
                <Icon name="check" className="shrink-0 text-[16px] leading-6 text-primary" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </List>
      )
    }

    case 'callout': {
      const caution = block.tone === 'caution'
      return (
        <div
          className={`flex items-start gap-sm rounded-xl p-md ${
            caution ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface'
          }`}
        >
          <Icon
            name={caution ? 'warning' : 'info'}
            className={`shrink-0 text-[18px] leading-6 ${caution ? '' : 'text-primary'}`}
          />
          <div className="min-w-0">
            {block.title && <p className="mb-xs font-label-md text-body-md font-bold">{block.title}</p>}
            <p className="font-body-md text-body-md">{block.text}</p>
          </div>
        </div>
      )
    }

    case 'table': {
      // A three-column table does not fit a phone, so each row is a card
      // headed by its first cell, with the other cells under their column
      // names. An empty first column header (the shedding/breakage table)
      // means the first cell is a row label, which reads the same way.
      const [, ...rest] = block.columns
      return (
        <div className="space-y-sm">
          {block.rows.map((row) => (
            <div key={row[0]} className="rounded-xl bg-surface-container-low p-md">
              <p className="mb-xs font-headline-md text-body-md font-bold text-on-surface">{row[0]}</p>
              <dl className="space-y-xs">
                {rest.map((column, i) => (
                  <div key={column}>
                    {rest.length > 1 && (
                      <dt className="font-label-md text-caption uppercase tracking-wider text-primary">
                        {column}
                      </dt>
                    )}
                    <dd className="font-body-md text-body-md text-on-surface-variant">{row[i + 1]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )
    }

    case 'coil-types':
      return (
        <ul className="grid grid-cols-3 gap-sm">
          {CURL_PATTERNS.map((pattern) => (
            <li key={pattern}>
              <CoilPatternArt pattern={pattern} />
              <p className="mt-xs font-label-md text-caption font-bold text-on-surface">Type {pattern}</p>
              <p className="font-body-md text-caption text-on-surface-variant">
                {GUIDE_COIL_LINES[pattern]}
              </p>
            </li>
          ))}
        </ul>
      )

    case 'strand':
      return (
        <div className="mx-auto max-w-xs">
          <StrandArt />
        </div>
      )

    case 'sequence':
      return (
        <ol className="flex flex-wrap items-center gap-xs" aria-label="Layering sequence">
          {block.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-xs">
              <span className="rounded-full bg-surface-container-lowest px-md py-1 font-label-md text-caption text-on-surface shadow-card">
                {step}
              </span>
              {i < block.steps.length - 1 && (
                <Icon name="chevron_right" className="text-[16px] text-secondary" />
              )}
            </li>
          ))}
        </ol>
      )

    case 'link':
      return (
        <Link
          to={block.to}
          className="flex items-center gap-sm rounded-xl bg-surface-container-high p-md font-label-md text-body-md text-primary transition-all active:scale-[0.98]"
        >
          <Icon name={block.icon} className="shrink-0" />
          <span className="flex-1">{block.label}</span>
          <Icon name="arrow_forward" className="shrink-0 text-[18px]" />
        </Link>
      )
  }
}

/** The PDF's captions under its three drawings, word for word. */
const GUIDE_COIL_LINES: Record<(typeof CURL_PATTERNS)[number], string> = {
  '4A': 'Small, visible coils',
  '4B': 'Tighter bends / zigzags',
  '4C': 'Very tight, compact coils',
}

export default function HairGuideScreen() {
  const { profile } = useHairProfile()
  const locs = isLocs(profile.identity)
  const chapters = hairGuideFor(profile.identity.hairType)
  const hidden = HAIR_GUIDE.length - chapters.length

  const requested = useOpenParam()
  const shown = requested && chapters.some((c) => c.id === requested) ? requested : null
  const [open, setOpen] = useState<string | null>(shown)
  useScrollToOpened(shown ? `guide-row-${shown}` : null)

  return (
    <>
      <SectionCrumb to="/care" label="Hair Care" />

      <section className="mb-xl">
        <p className="mb-xs font-label-md text-caption uppercase tracking-[0.2em] text-secondary">
          {HAIR_GUIDE_TITLE}
        </p>
        <h2 className="mb-sm font-headline-lg text-headline-lg-mobile text-on-background">
          {HAIR_GUIDE_TAGLINE}
        </h2>
        <p className="mb-md font-body-md text-body-md text-on-surface-variant">{HAIR_GUIDE_INTRO}</p>
        <div className="rounded-xl bg-surface-container-lowest p-md shadow-card">
          <p className="mb-xs font-label-md text-body-md font-bold text-primary">Your starting point</p>
          <p className="font-body-md text-body-md text-on-surface-variant">{HAIR_GUIDE_START}</p>
        </div>
      </section>

      {locs && hidden > 0 && (
        <Link
          to="/locs"
          className="mb-xl flex items-start gap-sm rounded-xl bg-surface-container p-md transition-all active:scale-[0.98]"
        >
          <Icon name="grass" className="shrink-0 text-primary" />
          <span className="flex-1 font-body-md text-caption text-on-surface-variant">
            {hidden} chapters are written for loose hair — detangling, combing and restyling
            that would damage locs — so they are left out for you. Locs World is written for
            yours.
          </span>
          <Icon name="arrow_forward" className="shrink-0 text-outline" />
        </Link>
      )}

      <section className="mb-2xl space-y-sm">
        {chapters.map((chapter) => {
          const isOpen = open === chapter.id
          return (
            <article
              key={chapter.id}
              id={`guide-row-${chapter.id}`}
              className={`scroll-mt-24 overflow-hidden rounded-2xl border-l-4 bg-surface-container-lowest shadow-card transition-colors ${
                isOpen ? 'border-secondary' : 'border-transparent'
              }`}
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`guide-${chapter.id}`}
                  onClick={() => setOpen(isOpen ? null : chapter.id)}
                  className="flex w-full items-center gap-md p-lg text-left active:scale-[0.99]"
                >
                  <span
                    aria-hidden
                    className="w-9 shrink-0 font-display-lg text-headline-md leading-none text-primary/80"
                  >
                    {chapter.number === undefined ? (
                      <Icon name="menu_book" />
                    ) : (
                      String(chapter.number).padStart(2, '0')
                    )}
                  </span>
                  <span className="min-w-0 flex-1 font-headline-md text-body-lg text-on-surface">
                    {chapter.title}
                  </span>
                  <Icon name={isOpen ? 'expand_less' : 'expand_more'} className="shrink-0 text-outline" />
                </button>
              </h3>

              <div id={`guide-${chapter.id}`} hidden={!isOpen} className="space-y-lg px-lg pb-lg">
                {chapter.sections.map((section, i) => (
                  <div key={section.heading ?? i} className="space-y-md">
                    {section.heading && (
                      <h4 className="font-headline-md text-body-lg font-bold text-on-surface">
                        {section.heading}
                      </h4>
                    )}
                    {section.blocks.map((block, j) => (
                      <Block key={j} block={block} />
                    ))}
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </section>
    </>
  )
}
