/**
 * Image slots for the SOS screen, taken from the prototype's `data-alt` text.
 *
 * The prototype pointed each slot at an `lh3.googleusercontent.com` URL. Those
 * are transient AI-generated placeholders: they expire, and a Capacitor app
 * loading remote images shows empty boxes the moment the device is offline. So
 * the slots resolve against local files instead.
 *
 * To fill a slot: drop a file into `src/assets/images/` named after the slot
 * key (e.g. `dryness-rescue.jpg`). The glob below picks it up automatically —
 * no import to add, no code to change. Until then the slot renders a styled
 * placeholder, so layout and spacing are correct either way.
 */

// Eager glob: Vite resolves, hashes, and bundles every matching file at build
// time. `query: '?url'` yields the emitted asset URL as a string.
const files = import.meta.glob('./images/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** Maps `./images/dryness-rescue.jpg` -> `dryness-rescue`. */
const bySlot = new Map(
  Object.entries(files).map(([path, url]) => [
    path.replace(/^\.\/images\//, '').replace(/\.[^.]+$/, ''),
    url,
  ]),
)

export interface ImageSlot {
  /** Alt text, carried over verbatim from the prototype's `data-alt`. */
  alt: string
  /** Resolved local asset URL, or undefined while the slot is unfilled. */
  src?: string
}

/**
 * Resolve a slot by key. Exported so screens can declare their own slots
 * inline (style cards, progress photos) without every key living in IMAGERY.
 */
export function slot(key: string, alt: string): ImageSlot {
  return { alt, src: bySlot.get(key) }
}

/* ------------------------------------------------------------------ *
 * Style angles
 *
 * A style is a three-dimensional thing and a single front-facing shot is
 * the least useful view of most of them — the back is where cornrows,
 * a flat twist pattern or a loc updo actually happen, and it is the one
 * side the wearer cannot see on themselves.
 *
 * Four fixed angles per style, resolved by convention from the style id:
 *
 *   src/assets/images/style-chunky-twists-front.webp
 *   src/assets/images/style-chunky-twists-back.webp
 *   src/assets/images/style-chunky-twists-side.webp
 *   src/assets/images/style-chunky-twists-round.webp
 *
 * Any angle with no file falls back to a placeholder on its own, so a
 * style with only a front shot still renders correctly and gains the
 * other three the moment the files land. See docs/image-prompts.md.
 * ------------------------------------------------------------------ */

export const STYLE_ANGLES = ['front', 'back', 'side', 'round'] as const
export type StyleAngle = (typeof STYLE_ANGLES)[number]

export const ANGLE_LABELS: Record<StyleAngle, string> = {
  front: 'Front',
  back: 'Back',
  side: 'Side',
  round: 'All round',
}

const ANGLE_ALT: Record<StyleAngle, string> = {
  front: 'seen from the front, face forward',
  back: 'seen from directly behind, showing the parting and finish at the back',
  side: 'seen in profile from one side, showing the ear and hairline',
  round: 'a three-quarter turn, showing how the shape reads from every side',
}

/** One angle of one style. */
export function styleAngle(styleId: string, styleName: string, angle: StyleAngle): ImageSlot {
  return slot(`style-${styleId}-${angle}`, `${styleName}, ${ANGLE_ALT[angle]}.`)
}

/** All four angles, in display order. */
export function styleAngles(
  styleId: string,
  styleName: string,
): { angle: StyleAngle; slot: ImageSlot }[] {
  return STYLE_ANGLES.map((angle) => ({ angle, slot: styleAngle(styleId, styleName, angle) }))
}

/**
 * The single image to put on a card.
 *
 * Prefers the front shot, then whichever angle actually exists, then the
 * legacy un-suffixed `style-<id>` file so images added before the angles
 * existed keep working. Placeholder if none of them do.
 */
export function styleCover(styleId: string, styleName: string): ImageSlot {
  for (const angle of STYLE_ANGLES) {
    const candidate = styleAngle(styleId, styleName, angle)
    if (candidate.src) return candidate
  }
  return slot(`style-${styleId}`, styleName)
}

/* ------------------------------------------------------------------ *
 * Loc looks
 *
 * The lookbook's pictures are cut from the same generated triptychs as
 * the library's, so they come as front, back and side — no `round`.
 * A style can carry more than one look (two different high buns, say):
 *
 *   loc-style-high-loc-bun-front.webp       look 1
 *   loc-style-high-loc-bun-2-front.webp     look 2
 *
 * Look 1 is always returned, placeholders and all, so a style with no
 * sheet yet still draws its frame. Later looks exist only when their
 * front file does. See scripts/import-loc-images.mjs.
 * ------------------------------------------------------------------ */

export const LOC_ANGLES = ['front', 'back', 'side'] as const
export type LocAngle = (typeof LOC_ANGLES)[number]

/** One look: its three angles, in display order. */
export type LocLook = { angle: LocAngle; slot: ImageSlot }[]

export function locStyleLooks(styleId: string, styleName: string): LocLook[] {
  const looks: LocLook[] = []
  for (let n = 1; ; n++) {
    const prefix = n === 1 ? `loc-style-${styleId}` : `loc-style-${styleId}-${n}`
    if (n > 1 && !bySlot.has(`${prefix}-front`)) break
    const label = n === 1 ? styleName : `${styleName}, look ${n}`
    looks.push(
      LOC_ANGLES.map((angle) => ({
        angle,
        slot: slot(`${prefix}-${angle}`, `${label}, ${ANGLE_ALT[angle]}.`),
      })),
    )
  }
  return looks
}

/** True when a loc style has at least its first front view. */
export function hasLocLook(styleId: string): boolean {
  return bySlot.has(`loc-style-${styleId}-front`)
}

export const IMAGERY = {
  avatar: slot(
    'avatar',
    'A professional headshot of a person with beautiful, well-maintained type 4C natural hair. The lighting is warm and cinematic, highlighting the intricate texture and health of the coils.',
  ),
  drynessRescue: slot(
    'dryness-rescue',
    'Close up photography of rich, hydrated natural hair curls glistening with moisture. Droplets of water and nourishing oil catch the soft, golden hour sunlight.',
  ),
  community1: slot(
    'community-1',
    'A portrait of a woman with a large, beautiful afro, smiling warmly.',
  ),
  community2: slot('community-2', 'Close up of a person with braided hair looking serene.'),
  community3: slot('community-3', 'A person with short, curly hair laughing.'),
  stopTheSnap: slot(
    'stop-the-snap',
    'Macro photography of a single hair strand under a microscope showing the cuticle structure, symbolising scientific care and precision.',
  ),

  /* Loc counterparts. The SOS screen swaps these in for a loc wearer, so
     the two sets need to hold the same visual weight — a filled loose-hair
     hero next to an empty loc placeholder would read as the app caring
     less about locs. Fill them in pairs. */
  locDryness: slot(
    'loc-dryness',
    'Close-up of healthy mature locs catching warm side light, the surface soft and matte rather than shiny, a fine mist of water droplets across them.',
  ),
  locStages: slot(
    'loc-stages',
    'Four portraits side by side showing the same person at starter, budding, teen and mature loc stages, evenly lit against a plain warm background.',
  ),
} satisfies Record<string, ImageSlot>
