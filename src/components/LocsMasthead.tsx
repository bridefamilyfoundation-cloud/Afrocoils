import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

/**
 * The espresso band that opens both Locs World screens.
 *
 * Locs World is a section of its own, and it should look like one: the
 * rest of the app is cream, so here the page is the brand's Deep Espresso
 * — the colour of the illustration's hair — with cream type and the
 * orange kept for accents. Only the `inverse-*` and `tertiary` roles are
 * used, so it is still the four brand colours and no new hex.
 *
 * The strands on the right are drawn, not photographed: a few hanging
 * locs as a texture, decorative and hidden from screen readers.
 */

function Strands() {
  // Each strand is a gentle wave from top to bottom; a slightly different
  // phase and length per strand keeps them from reading as a pattern.
  const strands = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const x = 18 + i * 22
    const len = 150 + ((i * 37) % 70)
    const amp = 4 + (i % 3)
    let d = `M ${x} -4`
    for (let y = 16; y <= len; y += 20) {
      d += ` Q ${x + (y % 40 === 16 ? amp : -amp)} ${y - 10} ${x} ${y}`
    }
    return { d, len, x }
  })
  return (
    <svg
      aria-hidden
      viewBox="0 0 180 240"
      className="pointer-events-none absolute -right-6 -top-2 h-full w-44 text-inverse-primary opacity-[0.16]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      {strands.map(({ d, len, x }) => (
        <g key={x}>
          <path d={d} strokeWidth={9} />
          <circle cx={x} cy={len + 4} r={5.5} fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  )
}

export default function LocsMasthead({
  kicker,
  title,
  back,
  children,
  tourId,
}: {
  kicker: string
  title: string
  /** Where the crumb goes, when this is a screen inside Locs World. */
  back?: { to: string; label: string }
  children?: ReactNode
  tourId?: string
}) {
  return (
    <section
      data-tour={tourId}
      className="relative mb-xl overflow-hidden rounded-[1.75rem] bg-inverse-surface px-lg pb-lg pt-lg text-inverse-on-surface shadow-xl shadow-tertiary/30"
    >
      <Strands />
      <div className="relative">
        {back && (
          <Link
            to={back.to}
            className="mb-md inline-flex items-center gap-xs rounded-full bg-inverse-on-surface/10 px-md py-1.5 font-label-md text-caption text-inverse-on-surface transition-all active:scale-95"
          >
            <Icon name="chevron_left" className="text-[16px]" />
            Part of {back.label}
          </Link>
        )}
        <p className="mb-xs flex items-center gap-sm font-label-md text-caption uppercase tracking-[0.2em] text-inverse-primary">
          <span aria-hidden className="h-px w-6 bg-secondary" />
          {kicker}
        </p>
        <h2 className="mb-sm max-w-[16ch] font-display-lg text-headline-lg-mobile text-inverse-on-surface sm:text-display-lg">
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}
