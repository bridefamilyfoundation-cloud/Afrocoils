import type { ImageSlot } from '../assets/imagery'
import Icon, { type IconName } from './Icon'

/**
 * Renders an image slot. When the slot has no local file yet, it draws a
 * placeholder in the app's own palette rather than a broken-image icon or an
 * empty box — so the layout reads correctly before final artwork lands.
 *
 * Given a `seed`, the placeholder is *distinct per subject* rather than the
 * same grey tile 22 times over. A wall of identical boxes reads as a broken
 * app; a wall of different ones reads as art that has not landed yet, which
 * is the truth. The colour is derived from the seed, so a given style keeps
 * the same placeholder across reloads and across the four angle slots —
 * shuffling on every render would be worse than one flat colour.
 */

/**
 * Palette pairs drawn from the design tokens, never raw hex.
 *
 * Deliberately the muted `-fixed` families rather than the loud containers:
 * these sit behind real content and must not compete with it once half the
 * library has photographs and half still does not.
 */
const PLACEHOLDER_THEMES = [
  'from-primary-fixed to-primary-fixed-dim text-on-primary-fixed',
  'from-secondary-fixed to-secondary-fixed-dim text-on-secondary-fixed',
  'from-tertiary-fixed to-tertiary-fixed-dim text-on-tertiary-fixed',
  'from-secondary-fixed-dim to-primary-fixed text-on-secondary-fixed',
  'from-tertiary-fixed-dim to-secondary-fixed text-on-tertiary-fixed',
] as const

/**
 * FNV-1a. Any stable string hash would do — the requirement is only that
 * the same seed picks the same theme every time, on every device.
 */
function themeFor(seed: string): string {
  let hash = 2_166_136_261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16_777_619)
  }
  return PLACEHOLDER_THEMES[Math.abs(hash) % PLACEHOLDER_THEMES.length]
}

export default function PrototypeImage({
  slot,
  className = '',
  rounded = 'rounded-lg',
  seed,
  icon,
  label,
  ratio,
}: {
  slot: ImageSlot
  className?: string
  /** Tailwind radius utility; slots differ (full for avatars, lg for cards). */
  rounded?: string
  /** Stable key deciding the placeholder colour. Usually the style id. */
  seed?: string
  /** Drawn instead of the generic image glyph. */
  icon?: IconName
  /** Shown under the icon where the tile is big enough to carry it. */
  label?: string
  /**
   * Intrinsic aspect, as `[w, h]`.
   *
   * Written onto the element as `width`/`height` so the browser reserves
   * the right box before the bytes arrive. Every call site already fixes
   * the box in CSS, so this is belt and braces — but the style photos are
   * lazy-loaded and the ones that matter are 4:5, and a `w-full` tile
   * with no declared ratio is exactly the case where a slow decode moves
   * the page under a thumb that is already reaching for a card.
   */
  ratio?: [number, number]
}) {
  const theme = seed
    ? themeFor(seed)
    : 'from-primary-fixed to-secondary-fixed text-on-primary-fixed'

  if (slot.src) {
    return (
      <img
        src={slot.src}
        alt={slot.alt}
        loading="lazy"
        decoding="async"
        // Scaled off 1:1-ish numbers so that if a class ever fails to
        // apply, the fallback is a sensibly sized image rather than a 4px
        // one. Only the ratio between them is ever used.
        width={ratio && ratio[0] * 100}
        height={ratio && ratio[1] * 100}
        // Same gradient as the placeholder, behind the photo. `loading="lazy"`
        // means the box exists before the bytes do, and an untinted one
        // flashes the page background through a hole in the grid.
        className={`bg-gradient-to-br object-cover ${theme} ${rounded} ${className}`}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={slot.alt}
      title={slot.alt}
      className={`flex flex-col items-center justify-center gap-1 overflow-hidden bg-gradient-to-br p-2 text-center ${theme} ${rounded} ${className}`}
    >
      <Icon name={icon ?? 'image'} className={label ? 'text-2xl opacity-70' : 'opacity-30'} />
      {label && (
        // `line-clamp-2` keeps a long style name from pushing the icon out of
        // a 96px card thumbnail.
        <span className="line-clamp-2 font-caption text-caption leading-tight opacity-80">
          {label}
        </span>
      )}
    </div>
  )
}
