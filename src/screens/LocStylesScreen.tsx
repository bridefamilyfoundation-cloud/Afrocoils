import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  hasLocLook,
  locStyleLooks,
  slot as imageSlot,
  type LocAngle,
  type LocLook,
} from '../assets/imagery'
import Icon from '../components/Icon'
import LocsMasthead from '../components/LocsMasthead'
import PrototypeImage from '../components/PrototypeImage'
import { LOC_STYLES, LOC_STYLE_GROUPS, type LocStyle } from '../content/loc-styles'
import { useOpenParam, useScrollToOpened } from '../lib/deep-link'

/**
 * The loc lookbook, at `/locs/styles`, inside Locs World.
 *
 * A screen of its own rather than another accordion chapter on `/locs`:
 * a chapter there is reading, this is looking, and eighteen photo strips
 * inside a collapsed list would be eighteen things to open one at a time.
 *
 * Laid out as numbered plates on espresso, like a printed lookbook, so it
 * does not read as the loose-hair library with a filter on. Every plate
 * shows the style front, back and side — the back is where most loc
 * styles actually happen, and it is the one view the wearer cannot get
 * of themselves.
 *
 * Not the style library. `/styles` is contributed looks with numbered
 * steps, ranked against the profile; these are names, one-line
 * descriptions and pictures, with no method yet. See
 * content/loc-styles.ts. `?open=<id>` scrolls to one plate: Ask lands
 * here.
 */

/**
 * The contribute form, pre-filled with this style's name and marked as
 * for locs. A style with no picture is a gap the community can fill, so
 * the gap says so and opens the door rather than just apologising.
 */
const contributeLink = (style: LocStyle) =>
  `/styles/submit?name=${encodeURIComponent(style.name)}&hair=Locs`

const ANGLE_LABEL: Record<LocAngle, string> = { front: 'Front', back: 'Back', side: 'Side' }
const NUMERALS = ['I', 'II', 'III', 'IV']

/**
 * One look, three angles. Swipe or tap: the strip scrolls with a finger
 * and the switch underneath follows it, or the switch scrolls the strip.
 */
function AngleViewer({ look, seed }: { look: LocLook; seed: string }) {
  const strip = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(0)

  const go = (i: number) => {
    const el = strip.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
    setShown(i)
  }

  return (
    <div>
      <div
        ref={strip}
        onScroll={(e) => {
          const el = e.currentTarget
          const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
          if (i !== shown) setShown(i)
        }}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {look.map(({ angle, slot }) => (
          <PrototypeImage
            key={angle}
            slot={slot}
            seed={seed}
            icon="photo_camera"
            label={`${ANGLE_LABEL[angle]} view coming`}
            rounded="rounded-none"
            ratio={[4, 5]}
            className="aspect-[4/5] w-full shrink-0 snap-center"
          />
        ))}
      </div>

      <div
        role="group"
        aria-label="Choose a view"
        className="mx-auto mt-md flex w-fit gap-xs rounded-full bg-inverse-on-surface/10 p-xs"
      >
        {look.map(({ angle }, i) => (
          <button
            key={angle}
            type="button"
            aria-pressed={shown === i}
            onClick={() => go(i)}
            className={`rounded-full px-md py-1.5 font-label-md text-caption transition-all active:scale-95 ${
              shown === i
                ? 'bg-inverse-on-surface text-tertiary'
                : 'text-inverse-on-surface/80'
            }`}
          >
            {ANGLE_LABEL[angle]}
          </button>
        ))}
      </div>
    </div>
  )
}

function LocPlate({ style, number }: { style: LocStyle; number: number }) {
  const looks = locStyleLooks(style.id, style.name)
  const [lookIndex, setLookIndex] = useState(0)
  const pictured = hasLocLook(style.id)

  return (
    <article
      id={`loc-plate-${style.id}`}
      className="scroll-mt-24 overflow-hidden rounded-[1.75rem] bg-inverse-surface p-md text-inverse-on-surface"
    >
      <header className="mb-md flex items-end gap-md px-xs pt-xs">
        <span className="font-display-lg text-display-lg leading-none text-secondary-container">
          {String(number).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1 pb-1">
          <span className="block font-label-md text-caption uppercase tracking-[0.2em] text-inverse-primary">
            {style.group === 'Starting locs' ? 'Starting method' : 'Loc style'}
          </span>
          <h4 className="font-headline-md text-body-lg text-inverse-on-surface">{style.name}</h4>
        </span>
      </header>

      {looks.length > 1 && (
        <div role="group" aria-label={`${style.name} looks`} className="mb-sm flex gap-xs px-xs">
          {looks.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={lookIndex === i}
              onClick={() => setLookIndex(i)}
              className={`rounded-full border px-md py-1 font-label-md text-caption transition-all active:scale-95 ${
                lookIndex === i
                  ? 'border-secondary-container bg-secondary-container text-on-secondary-container'
                  : 'border-inverse-on-surface/25 text-inverse-on-surface/80'
              }`}
            >
              Look {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Keyed by look so switching looks starts again at the front. */}
      <AngleViewer key={lookIndex} look={looks[lookIndex]} seed={style.id} />

      <p className="mt-md px-xs pb-xs font-body-md text-body-md text-inverse-on-surface/85">
        {style.description}
      </p>
      {!pictured && (
        <Link
          to={contributeLink(style)}
          className="mx-xs mb-xs mt-xs flex items-center gap-sm rounded-2xl bg-inverse-on-surface/10 p-md transition-all active:scale-[0.98]"
        >
          <Icon name="add_photo_alternate" className="shrink-0 text-inverse-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-label-md text-body-md text-inverse-on-surface">
              No pictures yet — contribute this style
            </span>
            <span className="block font-caption text-caption text-inverse-on-surface/75">
              Wear it? Share your photos and how you do it with the community.
            </span>
          </span>
          <Icon name="arrow_forward" className="shrink-0 text-inverse-primary" />
        </Link>
      )}
    </article>
  )
}

/** The contact strip in the masthead: every pictured style, one tap away. */
function Filmstrip({ onPick }: { onPick: (id: string) => void }) {
  const pictured = LOC_STYLES.filter((s) => hasLocLook(s.id))
  return (
    <div className="-mx-lg mt-lg flex items-start gap-sm overflow-x-auto px-lg pb-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {pictured.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onPick(style.id)}
          className="w-20 shrink-0 text-left transition-all active:scale-95"
        >
          <PrototypeImage
            slot={imageSlot(`loc-style-${style.id}-front`, style.name)}
            seed={style.id}
            rounded="rounded-xl"
            ratio={[4, 5]}
            className="block aspect-[4/5] w-20 ring-1 ring-inverse-on-surface/20"
          />
          <span className="mt-xs line-clamp-2 block font-caption text-caption leading-tight text-inverse-on-surface/80">
            {style.name}
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * Every style still without a picture, in one place, each a way into the
 * contribute form — so someone scrolling the whole lookbook ends on what
 * they could add to it.
 */
function MissingStyles() {
  const missing = LOC_STYLES.filter((s) => !hasLocLook(s.id))
  if (missing.length === 0) return null
  return (
    <section className="mb-xl rounded-[1.75rem] bg-surface-container-lowest p-lg ring-1 ring-outline-variant/40">
      <h3 className="mb-xs font-headline-md text-headline-md text-on-surface">
        Help finish the lookbook
      </h3>
      <p className="mb-md font-body-md text-body-md text-on-surface-variant">
        {missing.length === 1 ? 'One style has' : `${missing.length} styles have`} no pictures
        yet. If you wear one, contribute it — your photos and the way you do it.
      </p>
      <ul className="flex flex-wrap gap-sm">
        {missing.map((style) => (
          <li key={style.id}>
            <Link
              to={contributeLink(style)}
              className="inline-flex items-center gap-xs rounded-full bg-tertiary px-md py-2 font-label-md text-caption text-on-tertiary transition-all active:scale-95"
            >
              <Icon name="add" className="text-[16px]" />
              {style.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-md font-caption text-caption text-on-surface-variant">
        A person reads every contribution before anything is added, and it stays on your phone
        until it is sent.
      </p>
    </section>
  )
}

export default function LocStylesScreen() {
  const requested = useOpenParam()
  const target = requested && LOC_STYLES.some((s) => s.id === requested) ? requested : null
  useScrollToOpened(target ? `loc-plate-${target}` : null)

  const scrollTo = (id: string) =>
    document
      .getElementById(`loc-plate-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      <LocsMasthead
        kicker="Locs World · Lookbook"
        title="The Loc Lookbook"
        back={{ to: '/locs', label: 'Locs World' }}
      >
        <p className="max-w-[34ch] font-body-md text-body-md text-inverse-on-surface/85">
          {LOC_STYLES.length} looks, from the first coils to a wedding updo — each one front, back
          and side.
        </p>
        <Filmstrip onPick={scrollTo} />
      </LocsMasthead>

      {LOC_STYLE_GROUPS.map(({ group, note }, g) => (
        <section key={group} className="mb-2xl">
          <div className="mb-md flex items-center gap-md border-b border-outline-variant/60 pb-sm">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full bg-secondary font-display-lg text-body-lg font-bold text-on-secondary"
            >
              {NUMERALS[g]}
            </span>
            <div className="min-w-0">
              <h3 className="font-headline-md text-headline-md text-on-background">{group}</h3>
              <p className="font-body-md text-caption text-on-surface-variant">{note}</p>
            </div>
          </div>
          <div className="space-y-lg">
            {LOC_STYLES.filter((s) => s.group === group).map((style) => (
              <LocPlate key={style.id} style={style} number={LOC_STYLES.indexOf(style) + 1} />
            ))}
          </div>
        </section>
      ))}

      <MissingStyles />

      <p className="mb-2xl text-center font-caption text-caption text-on-surface-variant">
        Names and descriptions are from the AfroCoils Hairstyle Library, written by the team. The
        pictures are illustrations generated before release to show each style front, back and
        side.
      </p>
    </>
  )
}
