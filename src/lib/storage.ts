import { Preferences } from '@capacitor/preferences'
import { STYLES } from '../content/styles'
import { deletePhoto } from './photos'
import type { CareSchedule, HairIdentity, HairProfile, HairTexture, MyStyle } from './types'
import { PROFILE_VERSION, defaultSchedules } from './types'

/**
 * Persistence for the hair profile.
 *
 * `@capacitor/preferences` rather than raw localStorage: in the APK it
 * writes to Android SharedPreferences, which survives a WebView data
 * clear, and in the browser it falls back to localStorage so `npm run
 * dev` behaves the same. The API is async on both.
 *
 * The profile is stored as one JSON document under one key. It is small,
 * always read whole, and a single key keeps the migration story to one
 * function rather than one per field.
 */

const KEY = 'hair-profile:v1'

export function emptyProfile(): HairProfile {
  const now = new Date().toISOString()
  return {
    version: PROFILE_VERSION,
    bio: {},
    identity: {},
    state: {},
    preferences: {
      heatlessOnly: false,
      siliconeFree: false,
      proteinSensitive: false,
      protectiveBias: false,
      lowManipulation: false,
    },
    shelf: [],
    lengthUnit: 'in',
    lengthChecks: [],
    savedStyles: [],
    savedProducts: [],
    myStyles: [],
    careEvents: [],
    // Empty rather than seeded: the defaults depend on hair type, which is
    // unknown until onboarding. `ensureSchedules` fills them in once it is.
    schedules: [],
    submissions: [],
    updates: { check: true },
    createdISO: now,
    updatedISO: now,
  }
}

/**
 * Fill in anything a stored document is missing.
 *
 * Runs on every load, not just on a version bump, because a document
 * written by an older build is missing keys that today's code reads
 * unconditionally — and a crash on read would strand the user with a
 * profile they cannot repair from inside the app.
 */
function migrate(stored: unknown): HairProfile {
  const base = emptyProfile()
  if (typeof stored !== 'object' || stored === null) return base

  const s = stored as Partial<HairProfile>
  const next: HairProfile = {
    ...base,
    ...s,
    version: PROFILE_VERSION,
    // v2 → v3. Read unguarded by the profile screen and the header, so a
    // document written before bio existed needs the object, not just the
    // keys inside it.
    bio: { ...base.bio, ...s.bio },
    identity: migrateIdentity(base.identity, s.identity),
    state: { ...base.state, ...s.state },
    preferences: { ...base.preferences, ...s.preferences },
    shelf: Array.isArray(s.shelf) ? s.shelf : base.shelf,
    lengthChecks: Array.isArray(s.lengthChecks) ? s.lengthChecks : base.lengthChecks,
    // Pruned, not merely defaulted. The placeholder library the app first
    // shipped with was deleted, so a document written against it holds ids
    // that resolve to nothing — and because the Saved shelf is built by
    // filtering the *library*, a dead id is invisible and therefore
    // impossible to un-save from inside the app. It would sit there for
    // the life of the install.
    savedStyles: Array.isArray(s.savedStyles)
      ? s.savedStyles.filter(
          (id): id is string => typeof id === 'string' && STYLES.some((style) => style.id === id),
        )
      : base.savedStyles,
    savedProducts: Array.isArray(s.savedProducts) ? s.savedProducts : base.savedProducts,
    // v1 → v2 additions. Every one is an array the UI maps over unguarded,
    // so a missing key would be a crash on launch rather than a blank list.
    myStyles: Array.isArray(s.myStyles) ? s.myStyles.map(migrateMyStyle) : base.myStyles,
    careEvents: Array.isArray(s.careEvents) ? s.careEvents : base.careEvents,
    schedules: Array.isArray(s.schedules) ? s.schedules : base.schedules,
    // v3 → v4. Mapped over unguarded by the submit screen.
    submissions: Array.isArray(s.submissions) ? s.submissions : base.submissions,
    // v8 → v9. Read unguarded by the update prompt and About; an install
    // from before update checks existed gets them on, like a new one.
    updates:
      typeof s.updates === 'object' && s.updates !== null
        ? { ...base.updates, ...s.updates }
        : base.updates,
    createdISO: s.createdISO ?? base.createdISO,
  }

  // v5 → v7. The assistant, the generated SOS plans, the try-on and the
  // once-per-install welcome flag are gone, so the keys they wrote are
  // dropped here rather than carried
  // forward by the spread above. The stored document is still intact at
  // this point, which is what lets `loadProfile` read the photo
  // filenames out of it and delete the files before writing the cleaned
  // document back — files first, then the profile, the same order
  // MyStyles uses. Until that write happens the stale keys sit in
  // storage unread; every `update()` clears them.
  const loose = next as unknown as Record<string, unknown>
  for (const key of LEGACY_KEYS) delete loose[key]
  return next
}

/**
 * Keys earlier builds wrote that nothing reads now. Removed on first read.
 *
 * The first four are the AI features. `welcomeSeenISO` is from the build
 * where the front page was shown once per install — it is shown on every
 * launch now, so there is nothing to remember.
 */
const LEGACY_KEYS = [
  'sosHistory',
  'tryOns',
  'tryOnFace',
  'tryOnConsent',
  'welcomeSeenISO',
] as const

/**
 * Photo filenames left behind by the try-on feature.
 *
 * These are generated pictures of the user's own face, so leaving them
 * on disk after removing the feature that made them would be the worst
 * kind of tidy-up failure: invisible from inside the app and therefore
 * impossible to delete from inside it either.
 */
function orphanedPhotos(stored: unknown): string[] {
  if (typeof stored !== 'object' || stored === null) return []
  const s = stored as { tryOns?: unknown; tryOnFace?: unknown }
  const photos = Array.isArray(s.tryOns)
    ? s.tryOns
        .map((entry) => (entry as { photo?: unknown })?.photo)
        .filter((photo): photo is string => typeof photo === 'string')
    : []
  if (typeof s.tryOnFace === 'string') photos.push(s.tryOnFace)
  return photos
}

/**
 * v7 → v8. `strandWidth` became `texture`.
 *
 * A rename rather than a new field: "texture" is how thick one strand
 * is, which is what the picker always asked for — it was just filed
 * under a name that half the audience reads as curl pattern. The old
 * key is carried over when the new one is absent, so an answer given
 * before the rename survives, and is then dropped so the document does
 * not keep two names for one trait.
 */
function migrateIdentity(base: HairIdentity, stored: HairIdentity | undefined): HairIdentity {
  const next: HairIdentity = { ...base, ...stored }
  const legacy = (stored as { strandWidth?: HairTexture } | undefined)?.strandWidth
  if (next.texture === undefined && legacy !== undefined) next.texture = legacy
  delete (next as { strandWidth?: HairTexture }).strandWidth
  return next
}

/** Fields added to MyStyle after the first build shipped. */
function migrateMyStyle(style: MyStyle): MyStyle {
  return {
    ...style,
    photos: Array.isArray(style.photos) ? style.photos : [],
    wornISO: Array.isArray(style.wornISO) ? style.wornISO : [],
    favourite: style.favourite ?? false,
  }
}

/**
 * Seed the care schedules once the hair type is known.
 *
 * Returns null when nothing needs to change, so callers can skip the
 * write — this runs on every profile read and an unconditional update
 * would loop through the provider's effect.
 *
 * Existing schedules are never overwritten. A user who has set their own
 * wash cadence and then corrects their hair type keeps that cadence; only
 * the types that are missing entirely get added, and the ones that no
 * longer apply to their hair type get dropped.
 */
export function ensureSchedules(profile: HairProfile): CareSchedule[] | null {
  const { hairType } = profile.identity
  if (!hairType) return null

  const defaults = defaultSchedules(hairType)
  const allowed = new Set(defaults.map((s) => s.type))

  const kept = profile.schedules.filter((s) => allowed.has(s.type))
  const missing = defaults.filter((d) => !kept.some((s) => s.type === d.type))

  if (missing.length === 0 && kept.length === profile.schedules.length) return null
  return [...kept, ...missing]
}

export async function loadProfile(): Promise<HairProfile> {
  try {
    const { value } = await Preferences.get({ key: KEY })
    if (!value) return emptyProfile()

    const stored: unknown = JSON.parse(value)
    const profile = migrate(stored)

    // Files first, then the profile write — so a failure here leaves the
    // document still pointing at the images rather than orphaning them.
    const orphans = orphanedPhotos(stored)
    if (orphans.length > 0) {
      await Promise.all(orphans.map((path) => deletePhoto(path)))
      await saveProfile(profile)
    }

    return profile
  } catch (error) {
    // Corrupt JSON or an unavailable store. Starting fresh loses data, but
    // throwing here would take down the whole app on launch.
    console.error('[storage] could not load profile', error)
    return emptyProfile()
  }
}

export async function saveProfile(profile: HairProfile): Promise<void> {
  try {
    await Preferences.set({ key: KEY, value: JSON.stringify(profile) })
  } catch (error) {
    console.error('[storage] could not save profile', error)
  }
}
