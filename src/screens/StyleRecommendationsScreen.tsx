import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import SectionCrumb from '../components/SectionCrumb'
import StyleCard from '../components/StyleCard'
import ScreenFallback from '../components/ScreenFallback'
import { STYLES, rankStyles, styleExclusion } from '../content/styles'
import { deriveLengthBand } from '../lib/growth'
import { resolveLocStage } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'
import { PREFERENCE_LABELS, type CarePreferences } from '../lib/types'

/**
 * Hairstyle recommendations, at `/styles/recommended`.
 *
 * The profile-driven half of the library, split out from `/styles` so
 * the two questions stop sharing a scroll: the library is "show me
 * everything", this is "show me what suits *me*, and say why". The
 * Styles screen carries a button to it, and Hair Care links to it as D.
 *
 * The criteria panel is the point of the screen, not decoration. A
 * ranked list with no stated basis is indistinguishable from an
 * arbitrary one, and the honest answer here is narrower than a user
 * would assume: hair type excludes, length and two care preferences
 * rank, and **nothing else in the profile moves this list** — because
 * not one contributed entry declares a porosity, density or curl
 * pattern. Those three are real and they drive the product shelf and the
 * guides; claiming they rank styles would be a lie the screen could not
 * back up. If a future contribution declares them, `rankStyles` already
 * scores them and this note is what needs editing.
 */
export default function StyleRecommendationsScreen() {
  const { profile, update, ready } = useHairProfile()
  const { identity, preferences, savedStyles, lengthChecks } = profile

  const lengthBand = useMemo(() => deriveLengthBand(lengthChecks), [lengthChecks])
  const locStage = resolveLocStage(identity).stage

  const filterInput = useMemo(
    () => ({
      hairType: identity.hairType,
      porosity: identity.porosity,
      density: identity.density,
      curlPattern: identity.curlPattern,
      locStage: identity.hairType === 'Locs' ? locStage : undefined,
      lengthBand,
    }),
    [identity, locStage, lengthBand],
  )

  const ranked = useMemo(
    () => rankStyles(STYLES, filterInput, preferences),
    [filterInput, preferences],
  )

  /* What the profile actually matched, as opposed to what survived the
     hard filters. Only these have a reason to show. */
  const matched = ranked.filter((r) => r.score > 0)

  /*
   * What was dropped, and by what.
   *
   * Counted from the same function that did the dropping, so this cannot
   * claim a style was hidden by a care preference when it was actually
   * the hair-type filter or a loc stage. Those are three different
   * claims about the world and only one of them is the user's settings
   * talking.
   */
  const dropped = useMemo(() => {
    const counts = { hairType: 0, locStage: 0, preference: 0 }
    for (const style of STYLES) {
      const reason = styleExclusion(style, filterInput, preferences)
      if (reason) counts[reason] += 1
    }
    return counts
  }, [filterInput, preferences])

  const on = (Object.keys(preferences) as (keyof CarePreferences)[]).filter(
    (key) => preferences[key],
  )

  function toggleSave(id: string) {
    update({
      savedStyles: savedStyles.includes(id)
        ? savedStyles.filter((s) => s !== id)
        : [...savedStyles, id],
    })
  }

  if (!ready) return <ScreenFallback />

  const notes = [
    dropped.preference > 0 && `${dropped.preference} hidden by your care preferences`,
    dropped.locStage > 0 && `${dropped.locStage} for a different loc stage`,
    dropped.hairType > 0 &&
      `${dropped.hairType} for ${identity.hairType === 'Locs' ? 'loose hair' : 'locs'}`,
  ].filter((n): n is string => typeof n === 'string')

  return (
    <>
      <SectionCrumb to="/styles" label="Hair Styles" />

      <section className="mb-xl">
        <h2 className="mb-sm font-headline-lg text-headline-lg-mobile text-on-background">
          Hairstyle Recommendations
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Built from your hair profile. Every criterion below is something you told the app.
        </p>
      </section>

      {/* The criteria, and what each one is currently doing. */}
      <section className="mb-2xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-lg">
        <h3 className="mb-md font-label-md text-label-md uppercase tracking-widest text-primary">
          What this is based on
        </h3>

        <dl className="mb-md space-y-md">
          <div>
            <dt className="font-label-md text-label-md text-on-surface">
              Hair type{' '}
              {identity.hairType ? (
                <span className="rounded-full bg-secondary-container px-3 py-0.5 font-label-md text-caption text-on-secondary-container">
                  {identity.hairType}
                </span>
              ) : (
                <Link to="/profile" className="font-label-md text-caption text-primary underline">
                  not set
                </Link>
              )}
            </dt>
            <dd className="font-body-md text-caption text-on-surface-variant">
              A hard filter, not a preference. Loose-hair technique on locs is damaging, so a
              mismatch is dropped rather than ranked down.
            </dd>
          </div>

          <div>
            <dt className="font-label-md text-label-md text-on-surface">
              Length{' '}
              {lengthBand ? (
                <span className="rounded-full bg-secondary-container px-3 py-0.5 font-label-md text-caption text-on-secondary-container">
                  {lengthBand}
                </span>
              ) : (
                <Link to="/growth" className="font-label-md text-caption text-primary underline">
                  no length check yet
                </Link>
              )}
            </dt>
            <dd className="font-body-md text-caption text-on-surface-variant">
              Derived from your last length check on Growth rather than asked for again. It
              ranks, never excludes — most of these survive shorter hair with a piece at the
              tip.
            </dd>
          </div>

          <div>
            <dt className="font-label-md text-label-md text-on-surface">
              Care preferences{' '}
              {on.length > 0 ? (
                <span className="rounded-full bg-secondary-container px-3 py-0.5 font-label-md text-caption text-on-secondary-container">
                  {on.map((key) => PREFERENCE_LABELS[key]).join(', ')}
                </span>
              ) : (
                <Link to="/profile" className="font-label-md text-caption text-primary underline">
                  none set
                </Link>
              )}
            </dt>
            <dd className="font-body-md text-caption text-on-surface-variant">
              Protective and low-manipulation preferences lift a style up the list. Heatless,
              silicone-free and protein-sensitive drop one entirely.
            </dd>
          </div>
        </dl>

        {/* Said plainly, because the alternative is a screen implying
            that filling in porosity will reorder this list. It will not
            — no contributed entry declares one. */}
        <p className="rounded-xl bg-surface-container p-md font-body-md text-caption text-on-surface-variant">
          Your porosity, density, curl pattern and texture are <em>not</em> in this ranking.
          No contributed style declares them yet, so they would change nothing here — the
          first three do decide your{' '}
          <Link to="/products" className="text-primary underline">
            product shelf
          </Link>{' '}
          and the care guides you are shown.
        </p>
      </section>

      {notes.length > 0 && (
        <p className="mb-md font-caption text-caption text-on-surface-variant">
          Not shown: {notes.join(' · ')}.
        </p>
      )}

      {matched.length > 0 ? (
        <section className="mb-2xl">
          <div className="mb-md flex items-baseline justify-between gap-sm">
            <h3 className="font-label-md text-label-md uppercase tracking-widest text-primary">
              Matched your profile
            </h3>
            <span className="font-caption text-caption text-on-surface-variant">
              {matched.length} of {ranked.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            {matched.map((r) => (
              <StyleCard
                key={r.style.id}
                ranked={r}
                saved={savedStyles.includes(r.style.id)}
                onToggle={() => toggleSave(r.style.id)}
                showReasons
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="mb-2xl rounded-2xl bg-secondary-container p-lg">
          <div className="mb-sm flex items-center gap-sm">
            <Icon name="auto_awesome" className="text-on-secondary-container" />
            <h3 className="font-headline-md text-headline-md text-on-secondary-container">
              Nothing ranked yet
            </h3>
          </div>
          {/* What this says has to be what the ranking actually does.
              Length and the two style preferences are the signals that
              exist, so they are the ones offered. */}
          <p className="mb-md font-body-md text-body-md text-on-secondary-container/90">
            {!identity.hairType
              ? 'Start with whether you have loose hair or locs — the two share almost no technique, so that one answer halves this list.'
              : 'Log a length check on Growth, or turn on “prefer protective styles” — those are what this list reorders around today.'}
          </p>
          <Link
            to={identity.hairType ? '/growth' : '/profile'}
            className="inline-block rounded-full bg-on-secondary-container px-lg py-2 font-label-md text-label-md text-secondary-container transition-all active:scale-95"
          >
            {identity.hairType ? 'Log a length check' : 'Set your hair type'}
          </Link>
        </section>
      )}

      <Link
        to="/styles"
        className="mb-2xl flex items-center justify-center gap-sm rounded-full bg-surface-container-high py-3 font-label-md text-label-md text-on-surface transition-all active:scale-95"
      >
        <Icon name="auto_awesome" className="text-[18px]" />
        Browse the full library
      </Link>
    </>
  )
}
