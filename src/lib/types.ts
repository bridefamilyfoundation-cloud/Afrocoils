/**
 * The app's own data model, and the one request/response contract left
 * between it and `api/` — a community style submission. Both sides import
 * from here so a change to that shape fails typecheck rather than at runtime.
 *
 * Everything else in the app is computed on the device. There is no model
 * call behind any screen, so nothing here describes a prompt, a snapshot of
 * the user for a prompt, or a generated answer.
 */

/**
 * How long you have, as the three answers people actually give.
 *
 * A filter over the style library, not a field in a request: the Quick
 * Hairstyle screen shows what fits the time, drawn from content already
 * on the device.
 *
 * The labels are the ones a person recognises; the ranges behind them
 * are contiguous so nothing in the library can fall down a gap between
 * two bands. Anything over 45 minutes is not a quick hairstyle and is
 * reached through the Styles library instead.
 */
export const TIME_BANDS = [
  { label: '5–10 min', min: 0, max: 10 },
  { label: '15–20 min', min: 11, max: 20 },
  { label: '20–45 min', min: 21, max: 45 },
] as const

export type TimeBand = (typeof TIME_BANDS)[number]

export const OCCASIONS = ['Casual Day', 'Work/Professional', 'Formal Event', 'Gym/Active'] as const

export type Occasion = (typeof OCCASIONS)[number]

/* ------------------------------------------------------------------ *
 * Determinant factors
 *
 * The inputs that shape what the app shows you, split by how often each
 * one changes. The tiers are not cosmetic: identity is asked
 * once, state is re-asked as it goes stale, constraint is per-request,
 * and preference is a standing filter. Anything that blurs those
 * lifetimes ends up either nagging the user or acting on stale data.
 * ------------------------------------------------------------------ */

/** Identity tier — stable traits, asked once at onboarding. */

/**
 * The top-level fork.
 *
 * Locs are not a style worn on loose hair, they are a different thing to
 * own: they are washed, dried, retwisted and measured differently, and
 * most loose-hair advice is actively wrong for them (never detangle a
 * loc, never rake product through one). So this sits above every other
 * trait — the style library, the care guides, the calendar's default
 * schedule and the product filter all branch on it, and a loc wearer is
 * never shown a twist-out.
 */
export const HAIR_TYPES = ['Loose Natural', 'Locs'] as const
export type HairType = (typeof HAIR_TYPES)[number]

/** How the locs were started. Decides maintenance method and retwist cadence. */
export const LOC_METHODS = [
  'Comb coils',
  'Two-strand twists',
  'Interlocking',
  'Braidlocs',
  'Freeform',
  'Instant/crochet',
] as const
export type LocMethod = (typeof LOC_METHODS)[number]

/** Size family. Drives how many locs there are and how long maintenance takes. */
export const LOC_TYPES = ['Traditional', 'Microlocs', 'Sisterlocks', 'Freeform'] as const
export type LocType = (typeof LOC_TYPES)[number]

/**
 * The loc journey, in the names the community actually uses.
 *
 * Stage is the single biggest determinant of loc advice — a starter loc
 * unravels if you wash it wrong, a mature loc barely notices. It can be
 * estimated from the start date (see `deriveLocStage` in lib/locs.ts) but
 * stays user-settable, because hair type, method and retwist frequency
 * move these boundaries by months in either direction.
 */
export const LOC_STAGES = ['Starter', 'Budding', 'Teen', 'Mature', 'Rooted'] as const
export type LocStage = (typeof LOC_STAGES)[number]

/**
 * Curl pattern — the natural *shape* of a strand, and nothing else.
 *
 * The number is the shape; the letter is how tight that shape is, A
 * being the loosest of its family. Type 1 carries no letter because
 * there is only one way to be straight.
 *
 * This is not `HairTexture`, which is how wide a single fibre is, and
 * not `Density`, which is how many fibres there are. All three are
 * independent: fine 4C and coarse 4C want opposite products.
 */
export const CURL_PATTERNS = [
  '1',
  '2A',
  '2B',
  '2C',
  '3A',
  '3B',
  '3C',
  '4A',
  '4B',
  '4C',
] as const

/**
 * The four families, in the words the profile pickers and the quiz use.
 *
 * Held here rather than written out per screen because three surfaces
 * describe them and a fourth wording would be a fourth thing to keep
 * true.
 */
export const CURL_FAMILIES = [
  {
    digit: '1',
    name: 'Straight',
    summary: 'Lies flat, with no curves or bends. Smooth and shiny, and quick to go oily.',
  },
  { digit: '2', name: 'Wavy', summary: 'A soft "S" shape, or loose, beachy bends.' },
  {
    digit: '3',
    name: 'Curly',
    summary: 'Bouncy loops, spirals or corkscrews, with a three-dimensional spring to them.',
  },
  {
    digit: '4',
    name: 'Coily',
    summary: 'Tight coils or zig-zag patterns, with significant shrinkage.',
  },
] as const

/**
 * Hair texture — strictly how thick or wide a single fibre is.
 *
 * Fine strands have a very small diameter and feel soft or thin, and
 * heavy products weigh them down. Medium strands are thicker than fine
 * without being heavy, and hold volume and flexibility. Coarse strands
 * have a large diameter, feel thick or wiry, and often need heavier
 * products to hold on to moisture.
 *
 * Was called `strandWidth` until the terminology was settled; see
 * `migrate` in storage.ts, which carries the old key forward.
 */
export const HAIR_TEXTURES = ['Fine', 'Medium', 'Coarse'] as const

export const POROSITY_LEVELS = ['Low', 'Medium', 'High'] as const
/** How *many* strands are on the head. Orthogonal to texture. */
export const DENSITIES = ['Low', 'Medium', 'High'] as const
export const SCALP_CONDITIONS = ['Balanced', 'Dry', 'Oily', 'Sensitive', 'Flaky'] as const

export type CurlPattern = (typeof CURL_PATTERNS)[number]
export type PorosityLevel = (typeof POROSITY_LEVELS)[number]
export type Density = (typeof DENSITIES)[number]
export type HairTexture = (typeof HAIR_TEXTURES)[number]
export type ScalpCondition = (typeof SCALP_CONDITIONS)[number]

/** The family digit of a pattern — '4A' is a '4'. */
export function curlFamily(pattern: CurlPattern): string {
  return pattern[0]
}

/** The family a pattern belongs to, for copy that names it. */
export function curlFamilyOf(pattern: CurlPattern): (typeof CURL_FAMILIES)[number] | undefined {
  return CURL_FAMILIES.find((family) => family.digit === curlFamily(pattern))
}

/**
 * How a pattern is written on screen.
 *
 * Every value but one is already a readable code. A bare '1' in a row of
 * chips reads as a stray number, so it alone is spelled out.
 */
export function curlPatternLabel(pattern: CurlPattern): string {
  return pattern === '1' ? 'Type 1' : pattern
}

export interface HairIdentity {
  /** Undefined means the user has not chosen yet; treat as loose for safety. */
  hairType?: HairType
  /** The shape of a strand — Type 1 to Type 4. */
  curlPattern?: CurlPattern
  porosity?: PorosityLevel
  /** How many strands there are. */
  density?: Density
  /** How wide one strand is. Independent of density and of curl pattern. */
  texture?: HairTexture
  scalpCondition?: ScalpCondition

  /* Loc tier — only meaningful when hairType is 'Locs'. Kept rather than
     cleared when someone switches back to loose, so a person who takes
     locs down and re-locs later does not lose their start date. */
  locType?: LocType
  locMethod?: LocMethod
  /** User's own answer. Overrides the estimate derived from locStartISO. */
  locStage?: LocStage
  /** ISO date the locs were installed. Drives the stage estimate and age. */
  locStartISO?: string
}

/**
 * Curl pattern still matters with locs — it decides how fast they bud and
 * how much they shrink — but nothing else loose-specific does. This is the
 * list the completeness meter and the profile screen ask for, per type.
 */
export function identityFieldsFor(hairType: HairType | undefined): (keyof HairIdentity)[] {
  const shared: (keyof HairIdentity)[] = [
    'curlPattern',
    'porosity',
    'density',
    'texture',
    'scalpCondition',
  ]
  return hairType === 'Locs'
    ? [...shared, 'locType', 'locMethod', 'locStartISO']
    : shared
}

/* ------------------------------------------------------------------ *
 * Bio tier — who is asking
 *
 * Separate from identity because none of it is a property of the hair.
 * Name and photo are display only; climate and hard water are read by
 * the product shelf and the guides, because humidity, dry heat and
 * limescale change what actually works often enough that advice given
 * without them is advice given blind. None of it leaves the device —
 * there is nowhere for it to go.
 * ------------------------------------------------------------------ */

/**
 * Climate bands, not countries.
 *
 * Four coarse buckets rather than a location lookup: what matters to
 * hair is ambient humidity and temperature, and a city name would need a
 * geocoder and a weather API to become useful. It is also the difference
 * between storing a climate band and storing where somebody lives.
 */
export const CLIMATES = [
  'Humid / tropical',
  'Dry / arid',
  'Cold / low humidity',
  'Temperate',
] as const
export type Climate = (typeof CLIMATES)[number]

export interface HairBio {
  /** Display name. Shown in the app bar and nowhere else. */
  name?: string
  /**
   * Filename of the avatar, resolved through lib/photos.ts. A filename
   * and not the bytes, for the same reason MyStyle.photos is: the
   * profile document is read whole on launch and rewritten on every
   * edit.
   */
  photo?: string
  climate?: Climate
  /**
   * Orthogonal to climate rather than one of its values — hard water is
   * a plumbing fact, and someone in a humid city can have it too. Kept
   * separate so a user is not made to choose between the two.
   */
  hardWater?: boolean
}

/** State tier — true this week, not next. */
export const BALANCE_STATES = ['Needs protein', 'Balanced', 'Needs moisture'] as const
export type BalanceState = (typeof BALANCE_STATES)[number]

export interface HairState {
  balance?: BalanceState
  /** ISO date of the last wash day. Drives "how dirty is this hair" inference. */
  lastWashISO?: string
  protectiveStyle?: { name: string; installedISO: string }
}

/**
 * Preference tier — standing constraints.
 *
 * The `hard` ones exclude rather than rank: a style tagged `avoid:
 * heatlessOnly` is dropped from the library for someone who set it, not
 * shown greyed out and not merely sorted downwards. A user who has said
 * "heatless only" must never be handed a blow-dry, and a lower position
 * in a list is not a guarantee. See `styleExclusion` in
 * content/styles.ts, which is the one place that decision is made.
 */
export interface CarePreferences {
  heatlessOnly: boolean
  siliconeFree: boolean
  proteinSensitive: boolean
  protectiveBias: boolean
  lowManipulation: boolean
}

export const PREFERENCE_LABELS: Record<keyof CarePreferences, string> = {
  heatlessOnly: 'Heatless methods only',
  siliconeFree: 'Silicone-free products',
  proteinSensitive: 'Protein-sensitive',
  protectiveBias: 'Prefer protective styles',
  lowManipulation: 'Low manipulation',
}

export interface ShelfProduct {
  id: string
  name: string
  /** Free text: "Moisture base", "Seals the leave-in". */
  role: string
  inUse: boolean
}

/**
 * Outcome tier — observed results.
 *
 * Lengths are stored canonically in inches and converted at the edges;
 * `lengthUnit` is a display preference only. Storing in the displayed
 * unit would mean rewriting every historical row when the user switches,
 * and repeated switches would accumulate rounding drift.
 */
export const LENGTH_UNITS = ['in', 'cm'] as const
export type LengthUnit = (typeof LENGTH_UNITS)[number]

export const SECTIONS = ['nape', 'crown', 'sides', 'front'] as const
export type Section = (typeof SECTIONS)[number]

export interface LengthCheck {
  id: string
  dateISO: string
  /** Always inches, regardless of `lengthUnit`. */
  overall: number
  sections?: Partial<Record<Section, number>>
  note?: string
}

/**
 * Coarse length bands, derived rather than asked.
 *
 * Length is the first thing the style library's source material sorts
 * on, and for a real reason: a bun made out of your own hair needs
 * enough of it, and the entries that assume otherwise say so outright
 * ("if you have short hair, use an afro bun for the tip"). So it is
 * worth ranking on — but not worth another picker on the profile
 * screen, because the Growth tab is already recording length in inches.
 * The band comes from the most recent length check; see
 * `deriveLengthBand` in lib/growth.ts.
 *
 * The boundaries are the app's own milestone landmarks (neck at 8",
 * armpit at 16") rather than new numbers, and they are stretched
 * inches. Where any given head falls is arguable — shrinkage alone
 * moves it by half — which is exactly why length ranks a style down
 * rather than excluding it the way hair type does.
 */
export const LENGTH_BANDS = ['Short', 'Medium', 'Long'] as const
export type LengthBand = (typeof LENGTH_BANDS)[number]

/* ------------------------------------------------------------------ *
 * The user's own styles
 *
 * Distinct from the STYLES library in content/styles.ts: that is
 * editorial technique, this is "what I actually wore, and what it looked
 * like". Photos are stored as filenames only — the profile document is
 * read whole on every launch and written on every edit, so inlining
 * base64 images would grow it without bound and eventually exceed what
 * SharedPreferences will hold. The bytes live on disk via
 * lib/photos.ts; this holds the pointers.
 * ------------------------------------------------------------------ */

/**
 * Shared style vocabulary.
 *
 * Lives here rather than in content/styles.ts because `MyStyle` is part
 * of the persisted profile and the library re-exports it, so both sides
 * of the app categorise a style the same way.
 */
export const STYLE_CATEGORIES = [
  'Protective',
  'Wash Day',
  'Quick',
  'Stretched',
  'Defined',
  'Maintenance',
] as const
export type StyleCategory = (typeof STYLE_CATEGORIES)[number]

/**
 * Lives here rather than inline on `Style` because a community
 * submission has to offer the same three choices, and two copies of this
 * list would drift the moment either side gained a fourth.
 */
export const STYLE_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const
export type StyleDifficulty = (typeof STYLE_DIFFICULTIES)[number]

export interface MyStyle {
  id: string
  name: string
  category?: StyleCategory
  /** How long it took this user, which is the number that matters to them. */
  minutes?: number
  notes?: string
  /** Filenames under the app photo directory. Never data URIs — see above. */
  photos: string[]
  /** Every date worn, oldest first. Feeds the calendar and "worn N times". */
  wornISO: string[]
  favourite: boolean
  createdISO: string
}

/** A user photo is capped so one style cannot dominate on-device storage. */
export const MAX_PHOTOS_PER_STYLE = 6

/* ------------------------------------------------------------------ *
 * Community submissions
 *
 * The whole style library is contributed content, so the app needs a
 * way in. This is that: a name, a description, photographs and a credit
 * line — short on purpose, because a long form is a form nobody finishes.
 * The reviewer who reads it writes up whatever the library entry still
 * needs. Older submissions may also carry steps, kit and occasions; the
 * fields stay so those still read and still send.
 *
 * Deliberately a *separate* record from `MyStyle` rather than a flag on
 * it. `MyStyle` is a private diary of what someone wore, phrased for an
 * audience of one ("Sunday twists"); a submission is public, edited, and
 * has to stand on its own for a stranger following it in a mirror. It
 * also has to be able to outlive the diary entry it was seeded from, and
 * to carry things the diary has no business holding — how the
 * contributor wants to be credited, and their confirmation that the
 * photographs are theirs to give.
 *
 * Photos are filenames, for the same reason `MyStyle.photos` are: the
 * profile document is read whole on launch and rewritten on every edit.
 * ------------------------------------------------------------------ */

/**
 * Where a submission has got to.
 *
 * `Queued` is the honest end of the road today — there is no community
 * service to send to, so a submission waits on the device and the screen
 * says exactly that. `Sent` exists so that wiring one up later is a
 * status transition rather than a schema change.
 */
export const SUBMISSION_STATUSES = ['Queued', 'Sent'] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export interface StyleSubmission {
  id: string
  name: string
  /** No longer asked. Kept for submissions queued before the form was cut down. */
  category?: StyleCategory
  /**
   * Which hair this is for. Asked rather than inferred from the
   * submitter's own profile: people submit styles they have done on
   * other people, and getting this wrong is the one error in the library
   * that damages hair rather than merely wasting an afternoon.
   */
  hairType: HairType
  minutes?: number
  difficulty?: StyleDifficulty
  /** The contributor's description of the style. Required on new submissions. */
  note?: string
  occasions: Occasion[]
  needs: string[]
  steps: string[]
  /** Filenames under the app photo directory. Never data URIs. */
  photos: string[]
  /** How the contributor wants to be named. Blank means anonymous. */
  credit?: string
  /**
   * The contributor confirming the photographs are theirs to give.
   *
   * A required checkbox rather than fine print, and stored with the
   * submission rather than checked and forgotten, because the library
   * has already been burnt once by images that turned out to be somebody
   * else's: see src/assets/images/README.md.
   */
  rightsConfirmed: boolean
  status: SubmissionStatus
  createdISO: string
}

/** Four photos, matching the four angles a library entry can show. */
export const MAX_PHOTOS_PER_SUBMISSION = 4

/* ------------------------------------------------------------------ *
 * Care calendar
 *
 * Two halves that must not be conflated: `CareEvent` is what happened
 * (immutable history, drives streaks and the growth correlation), and
 * `CareSchedule` is what should happen (a cadence, from which the next
 * due date is derived). Storing a "next due" date instead of a cadence
 * would go stale the moment the user did the thing early or late.
 * ------------------------------------------------------------------ */

export const CARE_EVENT_TYPES = [
  'Wash day',
  'Deep condition',
  'Protein treatment',
  'Clarify',
  'Scalp treatment',
  'Retwist',
  'Trim',
  'Style installed',
  'Style taken down',
  'Length check',
  'Other',
] as const
export type CareEventType = (typeof CARE_EVENT_TYPES)[number]

/** Event types that only make sense for one hair type. */
export const LOC_ONLY_EVENTS: CareEventType[] = ['Retwist']
export const LOOSE_ONLY_EVENTS: CareEventType[] = ['Protein treatment']

export interface CareEvent {
  id: string
  type: CareEventType
  /**
   * Calendar day as `YYYY-MM-DD`, not a timestamp.
   *
   * These are day-grain records. A timestamp would render on the wrong
   * square for anyone whose local midnight is on the far side of UTC,
   * and "did I wash on the 3rd" is the only question this answers.
   */
  date: string
  note?: string
  createdISO: string
}

export interface CareSchedule {
  type: CareEventType
  /** Cadence in days. The next due date is derived from the last event. */
  everyDays: number
  enabled: boolean
  /** Whether to fire a device notification when it comes due. */
  reminder: boolean
  /** Local `HH:mm` to fire at. Morning by default — routines are planned, not sprung. */
  reminderTime: string
}

/**
 * Starting cadences, per hair type.
 *
 * Deliberately conservative and fully user-editable: wash frequency is
 * the single most argued-about number in natural hair care, and the app
 * has no business being confident about it. These are a starting point
 * that the user overrides, not a prescription.
 */
export function defaultSchedules(hairType: HairType | undefined): CareSchedule[] {
  const base = (type: CareEventType, everyDays: number, enabled = true): CareSchedule => ({
    type,
    everyDays,
    enabled,
    reminder: false,
    reminderTime: '09:00',
  })

  if (hairType === 'Locs') {
    return [
      base('Wash day', 10),
      base('Retwist', 42),
      base('Deep condition', 30),
      base('Clarify', 90, false),
      base('Scalp treatment', 14, false),
      base('Length check', 90),
    ]
  }

  return [
    base('Wash day', 7),
    base('Deep condition', 14),
    base('Protein treatment', 42, false),
    base('Clarify', 60, false),
    base('Scalp treatment', 14, false),
    base('Trim', 120, false),
    base('Length check', 90),
  ]
}

/* ------------------------------------------------------------------ *
 * App updates
 *
 * The app is sideloaded from the landing site, so nothing tells an
 * installed copy that a newer one exists. The site's build publishes
 * `latest.json` beside the APK (vite.site.config.ts writes it from
 * site/release.json) and the app reads it on open — see
 * src/lib/updates.ts. Declared here because both sides import it.
 * ------------------------------------------------------------------ */

/** `latest.json`, as the landing site publishes it. */
export interface UpdateManifest {
  version: string
  /** Android's versionCode. The comparison is on this, never on `version`. */
  versionCode: number
  minSdk: number
  /** "7.0", "12L" — the Android release `minSdk` corresponds to. */
  minAndroid: string
  bytes: number
  sha256: string
  /** `YYYY-MM-DD`, local to the machine that built it. */
  released: string
  /** The APK. Relative URLs resolve against the manifest's own URL. */
  url: string
  /** The download section of the site, for the checksum and the steps. */
  page: string
  /** What changed, one line each. Optional: a release may say nothing. */
  notes: string[]
}

/** The user's side of update checks. Lives on the profile so it survives restarts. */
export interface UpdateSettings {
  /** Check on open and on return. On by default; switched off on About. */
  check: boolean
  /** A version the user said "Not now" to, so it does not ask again. */
  dismissedVersionCode?: number
}

/** The persisted document. Versioned so migrations stay mechanical. */
export const PROFILE_VERSION = 9

export interface HairProfile {
  version: number
  /** Name, photo and climate. None of it leaves the device. */
  bio: HairBio
  identity: HairIdentity
  state: HairState
  preferences: CarePreferences
  shelf: ShelfProduct[]
  lengthUnit: LengthUnit
  lengthChecks: LengthCheck[]
  savedStyles: string[]
  /** Product ids from content/products.ts the user has saved. */
  savedProducts: string[]
  /** The user's own styles, with their own photos. */
  myStyles: MyStyle[]
  /** What actually happened, newest first. */
  careEvents: CareEvent[]
  /** What should happen, and how often. */
  schedules: CareSchedule[]
  /** Styles the user has offered to the community library. */
  submissions: StyleSubmission[]
  /** Raw porosity questionnaire result, kept so the test can show its working. */
  porosityTest?: { score: number; max: number; takenISO: string }
  /** Whether to check for a newer APK, and which one was declined. */
  updates: UpdateSettings
  /**
   * When the welcome tour was finished or declined. Absent means it has
   * never been offered, which is the only state that offers it on launch;
   * replaying it from the menu or the documentation page leaves this alone.
   */
  tourSeenISO?: string
  createdISO: string
  updatedISO: string
}

/* ------------------------------------------------------------------ *
 * Community submissions
 *
 * The wire contract for offering a style to the library. Lives here
 * rather than in api/ because both sides import it, so a change to the
 * shape fails typecheck on whichever side forgot.
 *
 * The device's `StyleSubmission` and this are deliberately not the same
 * type. A submission on the device carries `photos` as *filenames*,
 * because the profile document is read whole on launch and base64 inside
 * it would eventually exceed what SharedPreferences holds. On the wire
 * the bytes have to travel, so they are inlined here and nowhere else.
 * `status` and `id` do not cross at all: the device's copy is its own
 * bookkeeping, and the server issues its own id.
 * ------------------------------------------------------------------ */

export interface SubmissionRequest {
  name: string
  category?: StyleCategory
  /**
   * Which hair this is for.
   *
   * Validated server-side against `HAIR_TYPES` like everything else, and
   * worth saying why it matters more than the rest: an entry that claims
   * to be loc-safe when it is not is the one error in this library that
   * damages hair rather than wasting an afternoon.
   */
  hairType: HairType
  minutes?: number
  difficulty?: StyleDifficulty
  note?: string
  occasions: Occasion[]
  needs: string[]
  steps: string[]
  /**
   * The photographs, base64 JPEG, no `data:` prefix.
   *
   * Capped per photo at `MAX_SUBMISSION_PHOTO_BYTES` and in count at
   * `MAX_PHOTOS_PER_SUBMISSION`, both enforced on the server rather than
   * trusted from the client.
   */
  photosBase64: string[]
  credit?: string
  /**
   * The contributor's claim that the photographs are theirs to give.
   *
   * Required to be `true` — the route rejects anything else rather than
   * storing an unclaimed submission for a human to chase later. See
   * src/assets/images/README.md for what happened the last time the
   * library took images on trust.
   */
  rightsConfirmed: boolean
  /** The device's own id, echoed back so it can match the reply to a row. */
  clientId: string
}

export interface SubmissionResponse {
  /** The server's id for the stored submission. */
  id: string
  /** Echoed from the request so the device can find the row it belongs to. */
  clientId: string
  /**
   * Always `Pending` today.
   *
   * Nothing reaches the library without a human looking at it first. The
   * library is contributed content carrying a rights claim, and the one
   * thing a moderation queue must never do is auto-publish the thing it
   * exists to check.
   */
  review: ReviewState
}

/**
 * Where a submission has got to on the server.
 *
 * Distinct from `SubmissionStatus`, which is the *device's* view and
 * stays two-valued: a phone knows only whether it managed to send. This
 * is the reviewer's vocabulary and lives server-side.
 */
export const REVIEW_STATES = ['Pending', 'Approved', 'Rejected'] as const
export type ReviewState = (typeof REVIEW_STATES)[number]

/**
 * Decoded ceiling on one submitted photograph, in bytes.
 *
 * `capturePhoto()`
 * caps the long edge at 1400px and quality at 80, so anything larger did
 * not come through the app. Four of these is the real request ceiling,
 * which is why the count is capped too.
 */
export const MAX_SUBMISSION_PHOTO_BYTES = 4 * 1024 * 1024
