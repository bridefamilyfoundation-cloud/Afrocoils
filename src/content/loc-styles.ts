/**
 * Loc styles, at `/locs/styles`.
 *
 * From the AfroCoils Hairstyle Library (v1, 12 August 2026), compiled by
 * Majasan Racheal for the app. Names and descriptions are that document's,
 * word for word. The pictures are generated illustrations, front, back
 * and side, cut from the sheets in `Locs Images/Generated images/` by
 * `npm run images:locs` — see scripts/loc-generated-images.json.
 *
 * Kept apart from `STYLES` in content/styles.ts on purpose. Every entry
 * there has numbered steps and ranks against the profile; these have a
 * one-line description and no method yet, and a library entry without
 * steps is a draft. They belong in Locs World as a lookbook — what each
 * style is and what it looks like — until someone writes them up.
 *
 * The first five are ways to *start* locs rather than styles worn on them,
 * which is why they are grouped separately: picking a starter method is a
 * one-off decision, picking a style is weekly.
 */

export type LocStyleGroup = 'Starting locs' | 'Loc styles'

export interface LocStyle {
  /** Also the image prefix: `loc-style-<id>-front|back|side`. */
  id: string
  name: string
  group: LocStyleGroup
  description: string
}

export const LOC_STYLE_GROUPS: { group: LocStyleGroup; note: string }[] = [
  {
    group: 'Starting locs',
    note: 'Ways to begin. You choose one of these once, at the start of the journey.',
  },
  {
    group: 'Loc styles',
    note: 'Ways to wear locs once they have formed.',
  },
]

export const LOC_STYLES: LocStyle[] = [
  {
    id: 'starter-locs',
    name: 'Starter Locs',
    group: 'Starting locs',
    description:
      'The beginning stage of the loc journey. Hair is usually started with comb coils, two-strand twists, braids, or interlocking and is left to naturally form locs over time.',
  },
  {
    id: 'comb-coil-starter-locs',
    name: 'Comb Coil Starter Locs',
    group: 'Starting locs',
    description:
      'Small sections of hair are twisted using a comb to create neat coils that eventually mature into locs.',
  },
  {
    id: 'two-strand-twist-starter-locs',
    name: 'Two-Strand Twist Starter Locs',
    group: 'Starting locs',
    description:
      'Hair is divided into sections and twisted into two strands. A popular starter method because it is durable and beginner-friendly.',
  },
  {
    id: 'braided-starter-locs',
    name: 'Braided Starter Locs',
    group: 'Starting locs',
    description:
      'Hair is braided from the root to the ends to begin the loc process. Often preferred for active lifestyles.',
  },
  {
    id: 'interlocked-locs',
    name: 'Interlocked Locs',
    group: 'Starting locs',
    description:
      'Hair is pulled through itself at the roots using an interlocking tool to create a secure loc structure.',
  },
  {
    id: 'high-loc-bun',
    name: 'High Loc Bun',
    group: 'Loc styles',
    description:
      'Gather all locs at the crown of the head and secure them into a bun for a simple and elegant look.',
  },
  {
    id: 'low-loc-bun',
    name: 'Low Loc Bun',
    group: 'Loc styles',
    description: 'Locs are gathered at the nape of the neck and wrapped into a low bun.',
  },
  {
    id: 'half-up-half-down-locs',
    name: 'Half-Up Half-Down Locs',
    group: 'Loc styles',
    description:
      'The top half of the locs is tied up while the remaining locs hang freely and a little section can be added in front.',
  },
  {
    id: 'high-loc-ponytail',
    name: 'High Loc Ponytail',
    group: 'Loc styles',
    description: 'Pull all locs into a high ponytail at the top of the head.',
  },
  {
    id: 'low-loc-ponytail',
    name: 'Low Loc Ponytail',
    group: 'Loc styles',
    description: 'Gather locs into a ponytail positioned at the back of the neck.',
  },
  {
    id: 'side-swept-locs',
    name: 'Side-Swept Locs',
    group: 'Loc styles',
    description: 'Sweep all locs to one side of the head and secure them with pins if needed.',
  },
  {
    id: 'loc-petals',
    name: 'Loc Petals',
    group: 'Loc styles',
    description:
      'Individual locs are folded and pinned into flower-like shapes for a decorative updo.',
  },
  {
    id: 'barrel-twists',
    name: 'Barrel Twists',
    group: 'Loc styles',
    description:
      'Multiple locs are twisted together to form large rope-like twists that can be worn in various patterns.',
  },
  {
    id: 'barrel-twist-bun',
    name: 'Barrel Twist Bun',
    group: 'Loc styles',
    description: 'Barrel twists are wrapped into a bun for a neat protective style.',
  },
  {
    id: 'loc-mohawk',
    name: 'Loc Mohawk',
    group: 'Loc styles',
    description:
      'The sides are pinned upward while the middle section remains raised, creating a mohawk appearance.',
  },
  {
    id: 'loc-crown',
    name: 'Loc Crown',
    group: 'Loc styles',
    description: 'Locs are wrapped around the head to form a crown-like style.',
  },
  {
    id: 'double-bun-locs',
    name: 'Double Bun Locs',
    group: 'Loc styles',
    description: 'Locs are divided into two sections and styled into two buns.',
  },
  {
    id: 'loc-updo',
    name: 'Loc Updo',
    group: 'Loc styles',
    description:
      'Locs are pinned upward into an elegant style suitable for weddings, events, and formal occasions.',
  },
]
