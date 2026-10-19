import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ANGLE_LABELS, styleAngles } from '../assets/imagery'
import Icon, { type IconName } from './Icon'
import PrototypeImage from './PrototypeImage'

/**
 * The views of a style, as slides.
 *
 * A single front-facing photo is the least useful view of most of these.
 * The back is where a cornrow pattern, a flat-twist layout or a loc updo
 * actually happens, and it is the one side the wearer cannot check on
 * themselves — which is exactly why it belongs in the app rather than in
 * a mirror.
 *
 * The photography is shot as a set: same model, same top, same cream
 * backdrop, front, back and side, so the only thing that changes from
 * one slide to the next — and from one style to the next — is the hair.
 * Two things follow from that:
 *
 * - **Swipe, not tabs.** The views are one subject turning round, so the
 *   hero is a scroll-snapped track the thumb can drag through, with the
 *   thumbnails underneath as a map of it rather than as the only way in.
 * - **Side by side is worth a button.** Because the backdrop and framing
 *   match, the three views laid out in a row read as one turnaround, the
 *   way the sheets were made. That is the quickest way to see how a
 *   parting at the front becomes the pattern at the back.
 *
 * Only the angles that have a file become slides. The old strip drew all
 * four and greyed out the empty ones, which on a three-view set put a
 * dead "All round" tab under every style. With nothing photographed at
 * all, one placeholder stands in and the note says why.
 */
export default function StyleGallery({
  styleId,
  styleName,
  icon,
  className = '',
}: {
  styleId: string
  styleName: string
  /** Category glyph, drawn on the placeholder tiles. */
  icon?: IconName
  className?: string
}) {
  const all = styleAngles(styleId, styleName)
  const filled = all.filter((a) => a.slot.src)
  const slides = filled.length > 0 ? filled : all.slice(0, 1)
  const photographed = filled.length > 0

  const [index, setIndex] = useState(0)
  const [sideBySide, setSideBySide] = useState(false)
  const track = useRef<HTMLDivElement>(null)

  // Stable per instance, so two galleries on one screen cannot collide on
  // the ids that tie each thumbnail to the slide it drives.
  const baseId = useId()

  const goTo = useCallback((i: number, smooth = true) => {
    const el = track.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth && !reduce ? 'smooth' : 'auto' })
    setIndex(i)
  }, [])

  // Coming back from side by side, the track is new and starts at zero —
  // put it back on the view that was picked there.
  useEffect(() => {
    if (!sideBySide) goTo(index, false)
  }, [sideBySide])

  function onScroll() {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(Math.max(0, Math.min(slides.length - 1, i)))
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' && index < slides.length - 1) goTo(index + 1)
    else if (e.key === 'ArrowLeft' && index > 0) goTo(index - 1)
    else return
    e.preventDefault()
  }

  const current = slides[index] ?? slides[0]
  const many = slides.length > 1

  return (
    <div className={className}>
      <div className="relative">
        {sideBySide ? (
          <ul aria-label={`${styleName}, every view`} className="grid grid-cols-3 gap-xs">
            {slides.map(({ angle, slot }, i) => (
              <li key={angle}>
                <button
                  type="button"
                  onClick={() => {
                    setIndex(i)
                    setSideBySide(false)
                  }}
                  aria-label={`Open the ${ANGLE_LABELS[angle].toLowerCase()} view`}
                  className="block w-full transition-transform active:scale-95"
                >
                  <PrototypeImage
                    slot={slot}
                    seed={`${styleId}-${angle}`}
                    icon={icon}
                    rounded="rounded-xl"
                    ratio={[4, 5]}
                    className="aspect-[4/5] w-full"
                  />
                  <span className="mt-xs block text-center font-caption text-caption text-on-surface-variant">
                    {ANGLE_LABELS[angle]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div
              ref={track}
              role="region"
              aria-roledescription="carousel"
              aria-label={`${styleName} views`}
              tabIndex={many ? 0 : -1}
              onScroll={onScroll}
              onKeyDown={onKeyDown}
              className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-scrollbar]:hidden"
            >
              {slides.map(({ angle, slot }, i) => (
                <div
                  key={angle}
                  id={`${baseId}-${angle}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${slides.length}: ${ANGLE_LABELS[angle]}`}
                  className="w-full shrink-0 snap-center snap-always"
                >
                  <PrototypeImage
                    slot={slot}
                    seed={`${styleId}-${angle}`}
                    icon={icon}
                    label={photographed ? undefined : styleName}
                    rounded="rounded-2xl"
                    ratio={[4, 5]}
                    className="aspect-[4/5] w-full"
                  />
                </div>
              ))}
            </div>

            {/* Overlays sit outside the track so they stay put while it
                scrolls under them. */}
            {photographed && (
              <span
                aria-hidden
                className="glass-panel pointer-events-none absolute left-sm top-sm rounded-full px-3 py-1 font-label-md text-caption text-on-surface"
              >
                {ANGLE_LABELS[current.angle]}
                {many && (
                  <span className="text-on-surface-variant">
                    {' '}
                    · {index + 1}/{slides.length}
                  </span>
                )}
              </span>
            )}

            {many && index > 0 && (
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Previous view"
                className="glass-panel absolute left-sm top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-on-surface shadow-sm transition-transform active:scale-90"
              >
                <Icon name="chevron_left" />
              </button>
            )}
            {many && index < slides.length - 1 && (
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Next view"
                className="glass-panel absolute right-sm top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-on-surface shadow-sm transition-transform active:scale-90"
              >
                <Icon name="chevron_right" />
              </button>
            )}

            {many && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-sm flex justify-center gap-1.5"
              >
                {slides.map(({ angle }, i) => (
                  <span
                    key={angle}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? 'w-5 bg-secondary' : 'w-1.5 bg-surface/80'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {many && (
        <div className="mt-sm flex items-stretch gap-sm">
          {!sideBySide &&
            slides.map(({ angle, slot }, i) => {
              const selected = i === index
              return (
                <button
                  key={angle}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-controls={`${baseId}-${angle}`}
                  aria-current={selected}
                  aria-label={`${ANGLE_LABELS[angle]} view`}
                  className={`flex-1 overflow-hidden rounded-xl border-2 transition-all active:scale-95 ${
                    selected ? 'border-secondary' : 'border-transparent opacity-70'
                  }`}
                >
                  <PrototypeImage
                    slot={slot}
                    seed={`${styleId}-${angle}`}
                    icon={icon}
                    rounded="rounded-lg"
                    ratio={[1, 1]}
                    className="aspect-square w-full object-top"
                  />
                </button>
              )
            })}
          <button
            type="button"
            onClick={() => setSideBySide((v) => !v)}
            aria-pressed={sideBySide}
            className={`flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-sm font-caption text-caption transition-all active:scale-95 ${
              sideBySide
                ? 'flex-1 flex-row gap-xs bg-secondary py-sm text-on-secondary'
                : 'w-16 bg-surface-container-high text-on-surface'
            }`}
          >
            <Icon name={sideBySide ? 'close' : 'view_column'} className="text-[20px]" />
            {sideBySide ? 'Back to slides' : 'Side by side'}
          </button>
        </div>
      )}

      {/* Said where the picture is, not only in the FAQ: the method is the
          contributor's, the image is an illustration of it. */}
      {photographed && (
        <p className="mt-sm font-caption text-caption text-outline">
          Generated illustration of this style. The steps below were written by the person who
          wears it.
        </p>
      )}

      {!photographed && (
        <p className="mt-sm flex items-start gap-xs font-caption text-caption text-outline">
          <Icon name="image" className="mt-0.5 shrink-0 text-[14px]" />
          Photography for this style has not landed yet. The front, back and side views appear
          here as soon as the files are added.
        </p>
      )}
    </div>
  )
}
