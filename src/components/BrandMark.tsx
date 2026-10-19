import heroUrl from '../assets/brand/afro-hero.webp'
import markUrl from '../assets/brand/afro-mark.webp'

/**
 * The AfroCoils illustration, and the name beside it.
 *
 * One drawing, used everywhere the app identifies itself: the front
 * page, the app bar, the drawer, the footer, the favicon and the Android
 * launcher icon. It is the supplied artwork rather than something drawn
 * in code — a logo is a fixed thing, and an approximation of it in SVG
 * would be a second, slightly different logo that drifts away from the
 * real one.
 *
 * Two cuts of the same file, because one does not survive both sizes:
 *
 * - **`hero`** is the whole illustration, orange burst included, for
 *   anywhere it is the picture rather than a badge. The front page used
 *   to be this; it is a photo collage now, after the reference mockup.
 * - **`mark`** is cropped to the hair. The burst is nearly half the width
 *   of the full frame, so at the 32px the app bar draws it at, the
 *   uncropped version is an orange smudge with a dot in the middle.
 *
 * Both are pre-processed: the artwork's white field is knocked out so
 * the image sits on the cream page rather than in a white tile of its
 * own. If the artwork is ever replaced, every raster cut from it — the
 * favicon, the launcher icons, the splash screens — has to be
 * regenerated in the same pass, or the app ends up with four logos that
 * disagree. See the README.
 */
export function AfroMark({
  className = '',
  variant = 'mark',
  title,
}: {
  className?: string
  /** `hero` for the front page, `mark` for anything at UI scale. */
  variant?: 'hero' | 'mark'
  /** Set for a standalone image; omit where the name is read out beside it. */
  title?: string
}) {
  return (
    <img
      src={variant === 'hero' ? heroUrl : markUrl}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      // Contained, never cropped: trimming a face to fit a box is never
      // the right answer.
      className={`object-contain ${className}`}
      draggable={false}
    />
  )
}

/**
 * The mark and the name together.
 *
 * One component rather than four placements so the app bar, the drawer,
 * the footer and the front page cannot drift apart on spacing or on what
 * the name actually is — which is exactly what happened to the
 * prototype, where the footer said "Curly Hair" and the bar said
 * something else.
 */
export default function BrandLockup({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const mark = size === 'lg' ? 'h-12 w-12' : size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
  const text =
    size === 'lg'
      ? 'font-headline-lg text-headline-lg'
      : size === 'md'
        ? 'font-headline-lg-mobile text-headline-lg-mobile'
        : 'font-headline-md text-headline-md'

  return (
    <span className={`flex items-center gap-sm ${className}`}>
      <AfroMark className={`${mark} shrink-0`} />
      <span className={`${text} tracking-tight text-primary`}>AfroCoils</span>
    </span>
  )
}
