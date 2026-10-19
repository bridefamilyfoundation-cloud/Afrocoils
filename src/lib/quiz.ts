import type { HairIdentity, HairType } from './types'

/**
 * The hair-profile quiz.
 *
 * The profile screen has always been able to collect all of this, but as
 * a wall of pickers labelled with the answers rather than the questions —
 * "Hair texture: Fine / Medium / Coarse" assumes you already know which
 * you are, which is exactly what someone opening a hair app does not.
 * This asks in terms of things you can observe about your own head, and
 * writes the enum.
 *
 * The step list branches on hair type, because it is the first question
 * and it decides which of the rest apply. A loc wearer is never asked
 * about curl definition; a loose-hair user is never asked when they
 * locked. The set matches `identityFieldsFor` in types.ts, so the
 * completeness meter and the quiz agree about what "done" means.
 */

export interface QuizChoice {
  /** The stored enum value. */
  value: string
  /** What the user picks, phrased as an observation not a category. */
  label: string
  /** The tell — how to know this is you. */
  detail?: string
}

export interface QuizStep {
  id: string
  /** Which identity field this writes. */
  field: keyof HairIdentity
  kind: 'choice' | 'porosity' | 'date'
  title: string
  help?: string
  choices?: QuizChoice[]
  /**
   * Whether the step can be skipped. Hair type cannot: every downstream
   * branch in the app depends on it, and a guess there is not a slightly
   * worse recommendation but a wrong one.
   */
  optional: boolean
}

const HAIR_TYPE_STEP: QuizStep = {
  id: 'hairType',
  field: 'hairType',
  kind: 'choice',
  title: 'First — loose hair, or locs?',
  help: 'Everything else in the app branches on this. Loose-hair technique applied to locs is damaging, not just unhelpful, so nothing is shared between the two.',
  optional: false,
  choices: [
    {
      value: 'Loose Natural',
      label: 'Loose natural hair',
      detail: 'Curls, coils or kinks that can be separated, combed and re-styled.',
    },
    {
      value: 'Locs',
      label: 'Locs',
      detail: 'Matted by design. Includes traditional locs, microlocs, sisterlocks and freeform.',
    },
  ],
}

const CURL_PATTERN_STEP: QuizStep = {
  id: 'curlPattern',
  field: 'curlPattern',
  kind: 'choice',
  title: 'What does a single strand do when it dries with no product in it?',
  help: 'This is the shape of the strand — straight, wavy, curly or coily — not how thick it is. Look at the tightest section you have, usually the nape or the crown. Most people are a mix: pick the one that covers most of your head.',
  optional: true,
  choices: [
    {
      value: '1',
      label: 'Type 1 — stays flat',
      detail: 'No curves or bends at all. Smooth and shiny, and the roots go oily quickly.',
    },
    {
      value: '2A',
      label: 'Type 2 — a barely-there wave',
      detail: 'A loose, soft "S" that only shows towards the ends.',
    },
    {
      value: '2B',
      label: 'Type 2 — clear beachy bends',
      detail: 'The "S" holds down most of the length and keeps its shape.',
    },
    {
      value: '2C',
      label: 'Type 2 — waves with a few curls in them',
      detail: 'Bends deep enough that some sections close into loops.',
    },
    {
      value: '3A',
      label: 'Type 3 — large, loose loops',
      detail: 'About the width of a piece of sidewalk chalk.',
    },
    { value: '3B', label: 'Type 3 — springy ringlets', detail: 'About the width of a marker pen.' },
    {
      value: '3C',
      label: 'Type 3 — tight corkscrews',
      detail: 'About the width of a pencil, densely packed.',
    },
    {
      value: '4A',
      label: 'Type 4 — small, defined coils',
      detail: 'Springy O-shapes, roughly the width of a crochet needle.',
    },
    {
      value: '4B',
      label: 'Type 4 — sharp bends, more Z than O',
      detail: 'Folds at angles rather than curling; fluffy, less defined.',
    },
    {
      value: '4C',
      label: 'Type 4 — very tight, almost no visible curl',
      detail: 'Shrinks by 70% or more. The pattern only really shows when wet.',
    },
  ],
}

const DENSITY_STEP: QuizStep = {
  id: 'density',
  field: 'density',
  kind: 'choice',
  title: 'Pull your hair into a ponytail. How thick is the band of hair?',
  help: 'Density is how many strands you have, not how thick each one is. If you cannot make a ponytail, part your hair and look at how much scalp shows.',
  optional: true,
  choices: [
    {
      value: 'Low',
      label: 'Thinner than a coin',
      detail: 'Scalp shows easily through an unparted section.',
    },
    {
      value: 'Medium',
      label: 'About the width of a coin',
      detail: 'Some scalp shows when you part it, not otherwise.',
    },
    {
      value: 'High',
      label: 'Thicker than a coin',
      detail: 'You have to part deliberately to see scalp at all.',
    },
  ],
}

const TEXTURE_STEP: QuizStep = {
  id: 'texture',
  field: 'texture',
  kind: 'choice',
  title: 'Take one shed strand and roll it between your fingers.',
  help: 'Texture is how thick or wide one fibre is — nothing to do with how curly it is, or how much hair you have. Compare it against a piece of sewing thread. It is why two people with the same curl pattern can need completely different products.',
  optional: true,
  choices: [
    {
      value: 'Fine',
      label: 'Barely there',
      detail:
        'Thinner than thread, and soft to the touch. Heavy products weigh it down and flatten it.',
    },
    {
      value: 'Medium',
      label: 'About like thread',
      detail: 'You can feel it, but only just. Holds volume without going limp.',
    },
    {
      value: 'Coarse',
      label: 'Thick and wiry',
      detail:
        'Clearly thicker than thread, with a stiffness to it. Usually needs a heavier product to stay moisturised.',
    },
  ],
}

const SCALP_STEP: QuizStep = {
  id: 'scalpCondition',
  field: 'scalpCondition',
  kind: 'choice',
  title: 'How does your scalp behave between washes?',
  help: 'Scalp and hair are separate problems and often need opposite treatment — dry ends on an oily scalp is one of the most common combinations there is.',
  optional: true,
  choices: [
    {
      value: 'Balanced',
      label: 'Comfortable, no complaints',
      detail: 'No itch, no flaking, no grease by day three.',
    },
    {
      value: 'Dry',
      label: 'Tight and thirsty',
      detail: 'Feels tight after washing; occasional small flakes.',
    },
    {
      value: 'Oily',
      label: 'Greasy quickly',
      detail: 'Roots look weighed down within a day or two of washing.',
    },
    {
      value: 'Sensitive',
      label: 'Reacts to things',
      detail: 'Stings, tingles or goes red with certain products.',
    },
    {
      value: 'Flaky',
      label: 'Persistent flaking',
      detail: 'Visible flakes most of the time, often with itch.',
    },
  ],
}

const POROSITY_STEP: QuizStep = {
  id: 'porosity',
  field: 'porosity',
  kind: 'porosity',
  title: 'How your hair handles water',
  help: 'Five quick questions. Porosity drives almost every product decision you make, and it is the one trait almost nobody guesses correctly about themselves.',
  optional: true,
}

const LOC_TYPE_STEP: QuizStep = {
  id: 'locType',
  field: 'locType',
  kind: 'choice',
  title: 'What size are your locs?',
  help: 'Size decides how long maintenance takes and how much tension the roots can safely bear.',
  optional: true,
  choices: [
    {
      value: 'Traditional',
      label: 'Traditional',
      detail: 'Pencil-width or thicker. Usually 40 to 120 locs in total.',
    },
    {
      value: 'Microlocs',
      label: 'Microlocs',
      detail: 'Much smaller than a pencil. Often 150 to 400+ locs.',
    },
    {
      value: 'Sisterlocks',
      label: 'Sisterlocks',
      detail: 'Very fine, installed with a specific patented tool and grid.',
    },
    {
      value: 'Freeform',
      label: 'Freeform',
      detail: 'Whatever size they became on their own. Uneven by design.',
    },
  ],
}

const LOC_METHOD_STEP: QuizStep = {
  id: 'locMethod',
  field: 'locMethod',
  kind: 'choice',
  title: 'How were they started?',
  help: 'The starting method decides how they should be maintained — interlocked locs are not retwisted, and retwisting them fights the way they were built.',
  optional: true,
  choices: [
    {
      value: 'Comb coils',
      label: 'Comb coils',
      detail: 'Coiled section by section with the tail of a comb.',
    },
    {
      value: 'Two-strand twists',
      label: 'Two-strand twists',
      detail: 'Twisted in pairs and left to mat together.',
    },
    {
      value: 'Interlocking',
      label: 'Interlocking',
      detail: 'The end is pulled back through the root. No retwisting needed.',
    },
    {
      value: 'Braidlocs',
      label: 'Braidlocs',
      detail: 'Started as small braids and left to lock.',
    },
    {
      value: 'Freeform',
      label: 'Freeform',
      detail: 'No installation at all. Left to lock on their own.',
    },
    {
      value: 'Instant/crochet',
      label: 'Instant or crochet',
      detail: 'Locked immediately with a crochet hook.',
    },
  ],
}

const LOC_START_STEP: QuizStep = {
  id: 'locStartISO',
  field: 'locStartISO',
  kind: 'date',
  title: 'When did you start your locs?',
  help: 'This gives the app your loc stage, which is the single biggest factor in loc advice — a starter loc unravels if you wash it wrong, a mature loc barely notices. An approximate month is fine.',
  optional: true,
}

/**
 * The step list for a hair type.
 *
 * Hair type first and always. For locs, the loc-specific questions come
 * straight after it — they gate the most consequential advice in the
 * app, so they are asked before the general traits rather than after,
 * where someone who gave up halfway would never reach them.
 */
export function quizStepsFor(hairType: HairType | undefined): QuizStep[] {
  const shared = [POROSITY_STEP, DENSITY_STEP, TEXTURE_STEP, SCALP_STEP]

  if (hairType === 'Locs') {
    return [
      HAIR_TYPE_STEP,
      LOC_TYPE_STEP,
      LOC_METHOD_STEP,
      LOC_START_STEP,
      // Curl pattern still matters with locs: it decides how fast they
      // bud and how much they shrink.
      CURL_PATTERN_STEP,
      ...shared,
    ]
  }

  return [HAIR_TYPE_STEP, CURL_PATTERN_STEP, ...shared]
}
