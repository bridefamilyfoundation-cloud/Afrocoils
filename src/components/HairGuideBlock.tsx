import { Link } from 'react-router-dom'
import type { HairGuideBlock as Block } from '../content/hair-guide'
import { CURL_PATTERNS } from '../lib/types'
import { CoilPatternArt, StrandArt } from './HairIllustrations'
import Icon from './Icon'

/**
 * One block of the AfroCoils Hair Guide, drawn the same way wherever the
 * guide's words appear — the Hair Guide itself (`/care/guide`) and the
 * Hair Education lessons (`/care/learn`). Two renderers would let the
 * same paragraph look like two different claims.
 */
export default function HairGuideBlock({ block }: { block: Block }) {
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
