import heroUrl from '../assets/brand/afro-hero.webp'
import markUrl from '../assets/brand/afro-mark.webp'
import wordmarkUrl from '../assets/brand/afro-wordmark.webp'

/**
 * The AfroCoils logo, cut three ways.
 *
 * One file — `src/assets/brand/afrocoils-logo.png`, the profile
 * illustration above the "AfroCoils" wordmark — used everywhere the app
 * identifies itself: the front page, the app bar, the drawer, the
 * footer, the favicon, the launcher icon and the splash screen. It is the
 * supplied artwork rather than something drawn in code — a logo is a
 * fixed thing, and an approximation of it in SVG would be a second,
 * slightly different logo that drifts away from the real one.
 *
 * - **`hero`** is the whole logo, wordmark included, for anywhere it is
 *   the picture rather than a badge: the front page and the splash.
 * - **`mark`** is the illustration alone. At the 32px the app bar draws
 *   it at, the wordmark under it would be unreadable, so it is set
 *   beside it instead — see `BrandLockup`.
 * - The **wordmark** is the logo's own lettering, so the name in the app
 *   bar is the name in the logo rather than a retyping of it in the UI
 *   face.
 *
 * All three are cut by `npm run brand:import`, which keys the logo's
 * cream field out so it sits on the page's cream rather than in a tile
 * of a slightly different one. Replace the artwork by re-running that
 * script: it regenerates the favicons, the launcher icons and the splash
 * screens in the same pass, or the app ends up with logos that disagree.
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
  const word = size === 'lg' ? 'h-9' : size === 'md' ? 'h-8' : 'h-7'

  return (
    <span className={`flex items-center gap-xs ${className}`}>
      <AfroMark className={`${mark} shrink-0`} />
      {/* The lettering is a picture of the name; the name itself is
          here for screen readers and for anything that copies text. */}
      <img src={wordmarkUrl} alt="AfroCoils" className={`${word} w-auto`} draggable={false} />
    </span>
  )
}
