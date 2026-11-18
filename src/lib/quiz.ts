import type { HairIdentity, HairType } from './types'

/**
 * Hair Discovery: the guided hair-profile assessment at `/quiz`.
 *
 * The profile screen used to collect all of this as a wall of pickers
 * labelled with the answers rather than the questions — "Hair texture:
 * Fine / Medium / Coarse" assumes you already know which you are, which
 * is exactly what someone opening a hair app does not. Since 2026-11-18
 * this is the only place those answers are asked.
 *
 * Each of the six sections has two parts (owner's brief, 2026-11-18):
 *
 *   1. Understand Your Hair — what the trait is, and a labelled picture
 *      of every possible result (`help` and the choices' `name` and
 *      `caption`).
 *   2. Try It at Home — a DIY test (`diy`): what it tests, what you
 *      need, illustrated steps, then "what did you see?" answered with
 *      the same pictures, and "I'm not sure".
 *
 * The tests are deliberately gentle. Nothing pulls a hair out, combs or
 * stretches hair on the head, or uses heat: strands come from the comb
 * or the towel, water comes from a spray bottle, and looking is done in
 * a mirror. A test that could cause the damage the app exists to prevent
 * does not belong here.
 *
 * The step list branches on hair type. A loc wearer is never asked about
 * tangling; a loose-hair user is never asked when they locked. The
 * identity steps match `identityFieldsFor` in types.ts, so the
 * completeness meter and Discovery agree about what "done" means. Hair
 * condition writes `state` rather than `identity` because it is meant to
 * change, so it never counts towards "complete".
 *
 * Every illustration, example and test here is about Type 4 hair. The
 * results are guided self-assessment, and the screen says so: the best
 * match from what someone can see, never a diagnosis.
 */

export interface QuizChoice {
  /** The stored enum value. */
  value: string
  /** What the user picks, phrased as an observation not a category. */
  label: string
  /** The tell — how to know this is you. */
  detail?: string
  /** The same tell for a loc wearer, where it differs. */
  detailLocs?: string
  /** The category's name under its picture in "Understand your hair". */
  name?: string
  /** One short line under that name. */
  caption?: string
}

/**
 * The drawings that show what to *do* in a DIY test, as opposed to the
 * result pictures. Each is a component in `HairIllustrations.tsx`.
 */
export type DiyArt =
  | 'spray'
  | 'look'
  | 'timer'
  | 'glass'
  | 'mirror'
  | 'part'
  | 'paper'
  | 'roll'
  | 'comb'
  | 'shed-broken'
  | 'stretch'
  | 'ends'
  | 'touch'

export interface DiyStep {
  text: string
  /** The same step for a loc wearer, where doing it differs. */
  textLocs?: string
  art: DiyArt
}

/** "Try It at Home": one test a beginner can do with what is in the house. */
export interface DiyTest {
  name: string
  /** What the test tells you, in a sentence. */
  testing: string
  materials: string[]
  steps: DiyStep[]
  /** The question the answers below it answer. */
  question: string
  /** A caveat or a tell, shown between the steps and the question. */
  note?: { title: string; body: string; art?: DiyArt }
}

/**
 * How a step is answered.
 *
 * - `choice`: one answer, which advances on tap.
 * - `coils`: several patterns, then which one covers most of the head.
 * - `porosity`: the scored questions from porosity.ts.
 * - `scalp` / `condition`: one overall picture, then any concerns.
 * - `date`: the loc start date.
 */
export type QuizKind = 'choice' | 'coils' | 'porosity' | 'scalp' | 'condition' | 'date'

export interface QuizStep {
  /**
   * The step's id, which is also the profile row it fills: `?step=<id>`
   * asks this section alone and returns to `/profile?open=<id>`.
   */
  id: string
  /** The identity field this writes, when it writes one. */
  field?: keyof HairIdentity
  kind: QuizKind
  /** The short name above the title, and on the summary. */
  topic: string
  title: string
  /** Understand Your Hair: what the trait is, in a sentence or three. */
  help?: string
  /** Try It at Home. Absent on the hair type and loc steps. */
  diy?: DiyTest
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
  topic: 'Hair type',
  title: 'Do you wear your Type 4 hair loose, or in locs?',
  help: 'Everything else in the app branches on this. Loose-hair technique applied to locs is damaging, not just unhelpful, so nothing is shared between the two.',
  optional: false,
  choices: [
    {
      value: 'Loose Natural',
      label: 'Loose natural hair',
      detail: 'Type 4 coils and kinks that can be separated, combed and re-styled.',
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
  kind: 'coils',
  topic: 'Coil pattern',
  title: 'What shape do your coils make?',
  help: 'Your coil pattern is the shape a strand makes on its own. It has nothing to do with how thick the strand is or how much hair you have. Type 4 hair comes in three patterns, and the letter says how tight the coil is: A is the loosest, C the tightest.',
  diy: {
    name: 'Coil pattern observation',
    testing: 'The natural shape your strands take when nothing is weighing them down or holding them in place.',
    materials: ['A spray bottle of clean water', 'A mirror', 'Good daylight'],
    steps: [
      {
        art: 'spray',
        text: 'Start with clean hair that has no product in it, such as just after washing, before your leave-in.',
        textLocs: 'Look at the new growth at the root of a few locs, on a wash day before any product goes on.',
      },
      {
        art: 'spray',
        text: 'Lightly mist one small section with water until it is damp, not soaked. Do not comb, stretch or twist it.',
        textLocs: 'Lightly mist the roots of those locs until they are damp. Do not separate or palm-roll them.',
      },
      {
        art: 'look',
        text: 'Leave it alone for a few minutes. Then look closely at single strands in good light: at your crown, your nape and the sides.',
        textLocs: 'Leave them alone for a few minutes, then look closely at the new growth in good light: crown, nape and sides.',
      },
    ],
    question: 'Which patterns can you see? Pick every one you recognise.',
    note: {
      title: 'More than one is normal',
      body: 'Most Type 4 heads grow more than one pattern, often tighter at the nape and looser at the crown. Pick them all, then choose the one that covers most of your head.',
    },
  },
  optional: true,
  choices: [
    {
      value: '4A',
      name: '4A',
      caption: 'Defined S-coils',
      label: '4A: defined S-shaped coils',
      detail: 'Tight, springy coils you can see clearly, about the width of a crochet needle.',
    },
    {
      value: '4B',
      name: '4B',
      caption: 'Z-shaped bends',
      label: '4B: sharp Z-shaped bends',
      detail: 'The strand folds at angles instead of coiling round. Fluffier, with less definition.',
    },
    {
      value: '4C',
      name: '4C',
      caption: 'Very tight zig-zags',
      label: '4C: very tight zig-zags',
      detail: 'So tight that little pattern shows when dry. Shrinks the most, often by 70% or more.',
    },
  ],
}

const POROSITY_STEP: QuizStep = {
  id: 'porosity',
  field: 'porosity',
  kind: 'porosity',
  topic: 'Porosity',
  title: 'How Does Your Hair Absorb Moisture?',
  help: 'Porosity is how easily water gets into a strand, and how long it stays. Every strand is covered in tiny overlapping scales called the cuticle. When they lie flat, water struggles to get in. When they are raised, it gets in fast and leaves just as fast. Type 4 hair can sit anywhere on this scale.',
  diy: {
    name: 'Water absorption test',
    testing: 'How quickly water soaks into your hair, and how quickly it leaves again.',
    materials: ['A spray bottle of clean water', 'A clock or phone timer'],
    steps: [
      {
        art: 'spray',
        text: 'Choose a small section of clean, product-free hair, ideally on wash day after rinsing out your shampoo.',
        textLocs: 'Choose two or three clean locs on wash day, after rinsing out your shampoo and squeezing out the water.',
      },
      {
        art: 'look',
        text: 'Mist it a few times and watch closely. Do the drops sit on top like beads, sink in slowly, or vanish straight away?',
        textLocs: 'Mist them a few times and watch closely. Do the drops sit on the surface, sink in slowly, or vanish straight away?',
      },
      {
        art: 'timer',
        text: 'Note the time and let that section air-dry. Check it now and then: is it dry in under an hour, a few hours, or still damp much later?',
      },
    ],
    question: 'What did you notice? Answer the five questions below.',
    note: {
      title: 'What about the float test?',
      art: 'glass',
      body: 'You may have seen it: drop a clean shed strand into a glass of room-temperature water, and if it floats it is "low", if it sinks it is "high". It is fun to try, but it is not reliable on its own. Oil, product build-up and the water’s surface tension decide whether a strand floats far more than porosity does. So AfroCoils does not use it, and it does not change your result.',
    },
  },
  optional: true,
  choices: [
    { value: 'Low', name: 'Low', caption: 'Water beads on top' },
    { value: 'Medium', name: 'Medium', caption: 'Soaks in steadily' },
    { value: 'High', name: 'High', caption: 'In fast, out fast' },
  ].map((c) => ({ ...c, label: c.name })),
}

const DENSITY_STEP: QuizStep = {
  id: 'density',
  field: 'density',
  kind: 'choice',
  topic: 'Density',
  title: 'How Full Is Your Hair?',
  help: 'Density is how many strands grow on your head. Strand thickness is how wide each one is, and the two are separate: you can have lots of fine strands, or fewer coarse ones. Type 4 shrinkage makes almost any head look full, so look at your scalp, not at the volume.',
  diy: {
    name: 'Scalp visibility test',
    testing: 'How much scalp shows between your strands, which is the clearest sign of how many there are.',
    materials: ['A mirror', 'A hand mirror for the back', 'Your fingertips or a comb tail', 'Good light'],
    steps: [
      {
        art: 'mirror',
        text: 'Use dry hair that is stretched or loosely detangled, not fresh from a twist-out. Stand in front of a mirror in good light.',
        textLocs: 'Stand in front of a mirror in good light, on an ordinary day rather than straight after a retwist.',
      },
      {
        art: 'part',
        text: 'Gently part your hair down the middle with your fingertips or a comb tail. Do not pull or rake it.',
        textLocs: 'Look at the parts between your locs at the crown, where they are easiest to see.',
      },
      {
        art: 'mirror',
        text: 'Use the hand mirror to check the crown and the back as well. Notice how much scalp shows along the part and on either side of it.',
        textLocs: 'Use the hand mirror to check the back as well. Notice how much scalp shows around each loc base, not only along the parts.',
      },
    ],
    question: 'How much of your scalp could you see?',
  },
  optional: true,
  choices: [
    {
      value: 'Low',
      name: 'Low',
      caption: 'Scalp visible',
      label: 'Lots of scalp shows',
      detail: 'Your scalp is easy to see, even without making a part.',
    },
    {
      value: 'Medium',
      name: 'Medium',
      caption: 'Some scalp',
      label: 'Some scalp shows',
      detail: 'You can see scalp along a part, but not much on either side of it.',
    },
    {
      value: 'High',
      name: 'High',
      caption: 'Little scalp',
      label: 'Hardly any scalp shows',
      detail: 'You have to part your hair on purpose to see any scalp at all.',
    },
  ],
}

const TEXTURE_STEP: QuizStep = {
  id: 'texture',
  field: 'texture',
  kind: 'choice',
  topic: 'Strand thickness',
  title: 'How Thick Are Your Individual Hair Strands?',
  help: 'Strand thickness is the width of one single hair. It is not how tightly it coils, and it is not how much hair you have. Type 4 hair comes in every thickness, which is why two people with 4C hair can need completely different products.',
  diy: {
    name: 'Individual strand test',
    testing: 'The width of one single strand, compared with something you already know.',
    materials: ['One shed strand', 'A piece of ordinary sewing thread', 'A sheet of white paper'],
    steps: [
      {
        art: 'comb',
        text: 'Find one shed strand on your comb, brush or towel. There is no need to pull one out.',
        textLocs: 'Find one shed strand in your palm after palm-rolling, or on your pillowcase. There is no need to pull one out.',
      },
      {
        art: 'paper',
        text: 'Lay it on white paper right beside the sewing thread, and compare the two in good light.',
      },
      {
        art: 'roll',
        text: 'Then roll the strand gently between your finger and thumb. Can you feel it?',
      },
    ],
    question: 'How did your strand compare with the thread?',
  },
  optional: true,
  choices: [
    {
      value: 'Fine',
      name: 'Fine',
      caption: 'Thinner than thread',
      label: 'Thinner than the thread',
      detail: 'Hard to see, and you can barely feel it. Heavy products weigh it down.',
    },
    {
      value: 'Medium',
      name: 'Medium',
      caption: 'Like thread',
      label: 'About the same as the thread',
      detail: 'You can see it and you can just feel it. It holds volume without going limp.',
    },
    {
      value: 'Coarse',
      name: 'Coarse',
      caption: 'Thicker than thread',
      label: 'Thicker than the thread',
      detail:
        'Easy to see and clearly felt, firm or wiry. Usually needs richer products to stay moisturised.',
    },
  ],
}

const SCALP_STEP: QuizStep = {
  id: 'scalpCondition',
  field: 'scalpCondition',
  kind: 'scalp',
  topic: 'Scalp',
  title: 'What Does Your Scalp Feel Like?',
  help: 'Your scalp is skin, with needs of its own. A dry scalp under well-moisturised hair is common with Type 4 hair, and so is an oily scalp with dry ends. Look on an ordinary day between washes, not on wash day itself.',
  diy: {
    name: 'Scalp observation test',
    testing: 'Signs of dryness, oiliness, flaking or irritation on your scalp.',
    materials: ['A mirror', 'A hand mirror for the back', 'Good light', 'Clean fingertips'],
    steps: [
      {
        art: 'mirror',
        text: 'Wait until two or three days after washing. Stand in good light in front of a mirror.',
      },
      {
        art: 'part',
        text: 'Gently part your hair with your fingertips in three or four places: front, crown and sides. No scratching.',
        textLocs: 'Look at the scalp between your locs in three or four places: front, crown and sides. No scratching.',
      },
      {
        art: 'look',
        text: 'Look closely along each part. Can you see flakes, shine, or red or bumpy patches?',
        textLocs: 'Look closely around the loc bases. Can you see flakes, shine, or red or bumpy patches?',
      },
      {
        art: 'touch',
        text: 'Touch the scalp lightly with a clean fingertip. Does it feel greasy, tight, tender, or simply comfortable?',
      },
    ],
    question: 'Overall, which is most like your scalp?',
  },
  optional: true,
  choices: [
    {
      value: 'Balanced',
      name: 'Balanced',
      caption: 'Comfortable',
      label: 'Comfortable',
      detail: 'No itch, no flakes, and not greasy by day three.',
    },
    {
      value: 'Dry',
      name: 'Dry',
      caption: 'Tight, fine flakes',
      label: 'Tight and thirsty',
      detail: 'Feels tight after washing, with small, fine, dry flakes now and then.',
    },
    {
      value: 'Oily',
      name: 'Oily',
      caption: 'Shiny roots',
      label: 'Greasy quickly',
      detail: 'Your roots look shiny or weighed down within a day or two of washing.',
    },
    {
      value: 'Flaky',
      name: 'Flaky',
      caption: 'Flakes most days',
      label: 'Flakes most of the time',
      detail: 'Flakes you can see most days, often bigger or yellowish, and usually itchy.',
    },
    {
      value: 'Sensitive',
      name: 'Irritated',
      caption: 'Red or tender',
      label: 'Reacts to things',
      detail: 'Stings, tingles or goes red with some products, or after a tight style.',
    },
  ],
}

const CONDITION_STEP: QuizStep = {
  id: 'hairCondition',
  kind: 'condition',
  topic: 'Hair condition',
  title: 'How Is Your Hair Doing Currently?',
  help: 'This is how your hair is now, not how it always is, so answer for the last few weeks. It is the one answer here worth updating whenever things change.',
  diy: {
    name: 'Hair health observation',
    testing: 'Signs of dryness, tangling, split ends and breakage, and whether the hair you lose is shedding or breaking.',
    materials: ['A comb or brush you have just used', 'A sheet of white paper', 'Good light'],
    steps: [
      {
        art: 'comb',
        text: 'After styling, collect the hairs from your comb or brush and lay them on the white paper.',
        textLocs: 'Collect the hairs from your hands, pillowcase and bathroom floor after a day, and lay them on the white paper.',
      },
      {
        art: 'shed-broken',
        text: 'Sort them. A full-length strand with a tiny white bulb at one end has shed from the root, which is normal every day. A short piece with no bulb has broken off.',
      },
      {
        art: 'stretch',
        text: 'Take one full-length shed strand and stretch it gently between your fingers. Healthy hair gives a little and springs back. A strand that snaps at once is fragile.',
      },
      {
        art: 'ends',
        text: 'Look at the ends of a few sections in good light, without pulling them. Can you see splits, thin see-through ends or tiny white dots?',
        textLocs: 'Look along a few locs from root to tip. Can you see thinning where they meet the scalp, weak spots or fraying tips?',
      },
      {
        art: 'touch',
        text: 'Feel a section between your fingers. Is it soft, or rough and straw-like? Does it knot easily?',
        textLocs: 'Squeeze a loc gently. Does it feel full and soft, or dry and brittle?',
      },
    ],
    question: 'Overall, how is your hair right now?',
    note: {
      title: 'Shedding or breakage?',
      art: 'shed-broken',
      body: 'Shedding is a whole hair leaving from the root, with its white bulb, and losing some every day is normal. Breakage is a hair snapping somewhere along its length, so the piece is short and has no bulb. Lots of short pieces is the one to act on.',
    },
  },
  optional: true,
  choices: [
    {
      value: 'Healthy',
      name: 'Healthy',
      caption: 'Soft and springy',
      label: 'Doing well',
      detail: 'Soft, stretches and springs back, with very little breakage.',
      detailLocs: 'Full from root to tip, soft when squeezed, with very little breakage.',
    },
    {
      value: 'Dry',
      name: 'Dry',
      caption: 'Rough, frizzy',
      label: 'Dry',
      detail: 'Feels rough or straw-like soon after you moisturise.',
      detailLocs: 'Locs feel hard or brittle, and moisture does not seem to last.',
    },
    {
      value: 'Damaged',
      name: 'Damaged',
      caption: 'Split, rough ends',
      label: 'Damaged',
      detail:
        'Rough or split ends, or patches that no longer hold a coil, often after heat, colour or a relaxer.',
      detailLocs:
        'Weak or thinning spots along a loc, or fraying ends, often after colour or tight maintenance.',
    },
    {
      value: 'Breakage-prone',
      name: 'Breakage-prone',
      caption: 'Short broken bits',
      label: 'Breaking easily',
      detail: 'Short broken pieces in your comb, and length that never seems to stay.',
      detailLocs: 'Short pieces on your hands and pillow, or locs thinning where they meet the scalp.',
    },
  ],
}

const LOC_TYPE_STEP: QuizStep = {
  id: 'locType',
  field: 'locType',
  kind: 'choice',
  topic: 'Loc size',
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
  topic: 'How they started',
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
  topic: 'Loc start date',
  title: 'When did you start your locs?',
  help: 'This gives the app your loc stage, which is the single biggest factor in loc advice — a starter loc unravels if you wash it wrong, a mature loc barely notices. An approximate month is fine.',
  optional: true,
}

/**
 * The step list for a hair type.
 *
 * Type 4 first, on the owner's instruction (2026-11-18): the coil
 * pattern opens Hair Discovery, because it is the thing AfroCoils is
 * about. Loose or loc'd comes straight after, and it is still the one
 * step that cannot be skipped. For locs, the loc-specific questions
 * follow it. They gate the most consequential advice in the app, so
 * they are asked before the general traits rather than after, where
 * someone who gave up halfway would never reach them. Then the rest of
 * the six sections, in `DISCOVERY_TOPICS` order.
 */
export function quizStepsFor(hairType: HairType | undefined): QuizStep[] {
  const rest = [POROSITY_STEP, DENSITY_STEP, TEXTURE_STEP, SCALP_STEP, CONDITION_STEP]

  if (hairType === 'Locs') {
    // Coil pattern still matters with locs: it decides how fast they bud
    // and how much they shrink.
    return [
      CURL_PATTERN_STEP,
      HAIR_TYPE_STEP,
      LOC_TYPE_STEP,
      LOC_METHOD_STEP,
      LOC_START_STEP,
      ...rest,
    ]
  }

  return [CURL_PATTERN_STEP, HAIR_TYPE_STEP, ...rest]
}

/** The six sections Hair Discovery's opening screen lists, in step order. */
export const DISCOVERY_TOPICS = [
  'Coil pattern',
  'Porosity',
  'Density',
  'Strand thickness',
  'Scalp',
  'Hair condition',
] as const
