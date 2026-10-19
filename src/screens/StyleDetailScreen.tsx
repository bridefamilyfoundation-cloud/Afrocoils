import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'
import SectionCrumb from '../components/SectionCrumb'
import StyleGallery from '../components/StyleGallery'
import ScreenFallback from '../components/ScreenFallback'
import { CATEGORY_ICONS, STYLES, rankStyles, styleExclusion } from '../content/styles'
import { deriveLengthBand } from '../lib/growth'
import { resolveLocStage } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'

/**
 * One style, at full size.
 *
 * The library grid can show a name, a thumbnail and a time — it cannot
 * show every camera angle and a numbered method for every entry at once
 * without becoming unreadable. So the card is the index and this is the
 * entry: every view, the how-to, and an honest note when the style
 * is not one the app would pick for this particular head.
 */
export default function StyleDetailScreen() {
  const { id } = useParams()
  const { profile, update, ready } = useHairProfile()
  const { identity, preferences, savedStyles, lengthChecks } = profile

  const style = STYLES.find((s) => s.id === id)
  const locStage = resolveLocStage(identity).stage
  const lengthBand = deriveLengthBand(lengthChecks)

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

  // Ranked as a set of one, so the "why this suits you" reasons come from
  // the same function the library uses rather than a second copy of the
  // rules that could disagree with it.
  const ranked = useMemo(
    () => (style ? rankStyles([style], filterInput, preferences)[0] : undefined),
    [style, filterInput, preferences],
  )

  // Why it was dropped, if it was — asked of the same function that does
  // the dropping. This screen used to infer it, and inferred "care
  // preferences" for anything that was not a hair-type mismatch, which
  // would misname a loc-stage exclusion the moment a loc style lands.
  // Reached directly by URL or from a saved list, so it has to be handled
  // rather than assumed away.
  const exclusion = useMemo(
    () => (style ? styleExclusion(style, filterInput, preferences) : undefined),
    [style, filterInput, preferences],
  )

  if (!ready) return <ScreenFallback />
  if (!style) return <Navigate to="/styles" replace />

  const saved = savedStyles.includes(style.id)
  const excluded = exclusion !== undefined

  function toggleSave() {
    if (!style) return
    update({
      savedStyles: saved
        ? savedStyles.filter((s) => s !== style.id)
        : [...savedStyles, style.id],
    })
  }

  return (
    <>
      <SectionCrumb to="/styles" label="Hair Styles" />
      <ScreenHeader title={style.name} subtitle={style.note} />

      <section className="mb-xl">
        {/* Keyed on the style so the chosen angle resets with it. The
            router reuses this element across a change of :id, and the
            gallery picks its opening angle once at mount — without the
            key, arriving from a style shot only from behind would open
            the next one on an angle it has no photo for. */}
        <StyleGallery
          key={style.id}
          styleId={style.id}
          styleName={style.name}
          icon={CATEGORY_ICONS[style.category]}
        />
      </section>

      <section className="mb-xl flex flex-wrap items-center gap-xs">
        <span className="flex items-center gap-xs rounded-full bg-surface-container-high px-3 py-1 font-caption text-caption text-on-surface">
          <Icon name="schedule" className="text-[14px]" />
          {style.minutes} min
        </span>
        <span className="rounded-full bg-surface-container-high px-3 py-1 font-caption text-caption text-on-surface">
          {style.difficulty}
        </span>
        <span className="rounded-full bg-surface-container-high px-3 py-1 font-caption text-caption text-on-surface">
          {style.category}
        </span>
        {style.lowManipulation && (
          <span className="rounded-full bg-tertiary-fixed px-3 py-1 font-caption text-caption text-on-tertiary-fixed">
            Low manipulation
          </span>
        )}
        {/* Where it is meant to be worn is often the thing that decides
            between two styles costing the same half hour, so it sits in
            the same row as the time rather than below the fold. */}
        {style.occasions?.map((occasion) => (
          <span
            key={occasion}
            className="flex items-center gap-xs rounded-full bg-primary-fixed px-3 py-1 font-caption text-caption text-on-primary-fixed"
          >
            <Icon name="checkroom" className="text-[14px]" />
            {occasion}
          </span>
        ))}
      </section>

      <section className="mb-xl flex gap-sm">
        <button
          type="button"
          onClick={toggleSave}
          aria-pressed={saved}
          className={`flex flex-1 items-center justify-center gap-sm rounded-full py-3 font-label-md text-label-md transition-all active:scale-95 ${
            saved
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-primary text-on-primary'
          }`}
        >
          <Icon name={saved ? 'bookmark' : 'bookmark_border'} filled={saved} />
          {saved ? 'Saved' : 'Save this style'}
        </button>
        <Link
          to="/growth"
          className="flex items-center justify-center gap-sm rounded-full border border-outline-variant px-lg py-3 font-label-md text-label-md text-on-surface active:scale-95"
        >
          <Icon name="add_photo_alternate" className="text-[18px]" />
          Log it
        </Link>
      </section>

      {excluded && (
        <section className="mb-xl rounded-2xl bg-surface-container p-lg">
          <div className="mb-sm flex items-center gap-sm">
            <Icon name="block" className="text-primary" />
            <h2 className="font-headline-md text-body-lg text-on-surface">
              Not one the app would suggest for you
            </h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {exclusion === 'hairType'
              ? identity.hairType === 'Locs'
                ? 'This is a loose-hair technique. On locs it would mean separating or re-setting hair that is meant to stay matted, so it is kept out of your library.'
                : 'This one is for locs, and assumes hair that has already locked.'
              : exclusion === 'locStage'
                ? `It needs locs further along than ${locStage ? locStage.toLowerCase() : 'yours are'} — the hair has to have locked enough to hold the shape. It comes back on its own as your locs mature.`
                : 'It clashes with one of your care preferences. You are seeing it because you came here directly.'}
          </p>
          <Link
            to="/profile"
            className="mt-md inline-block font-label-md text-label-md text-primary underline"
          >
            Check your profile
          </Link>
        </section>
      )}

      {ranked && ranked.reasons.length > 0 && (
        <section className="mb-xl rounded-2xl bg-secondary-container p-lg text-on-secondary-container">
          <h2 className="mb-sm font-headline-md text-body-lg">Why this suits your hair</h2>
          <ul className="space-y-xs">
            {ranked.reasons.map((reason) => (
              <li key={reason} className="flex gap-sm font-body-md text-body-md">
                <Icon name="check" className="mt-0.5 shrink-0 text-[18px]" />
                <span className="first-letter:uppercase">{reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Before the method, not inside it. Several of these need a hair
          piece, wool or a rat-tail comb, and finding that out at step
          four means starting again with wet hair. */}
      {style.needs && style.needs.length > 0 && (
        <section className="mb-xl rounded-2xl bg-surface-container p-lg">
          <div className="mb-sm flex items-center gap-sm">
            <Icon name="inventory_2" className="text-primary" />
            <h2 className="font-headline-md text-body-lg text-on-surface">What you need</h2>
          </div>
          <ul className="flex flex-wrap gap-xs">
            {style.needs.map((item) => (
              <li
                key={item}
                className="rounded-full bg-surface-container-high px-3 py-1 font-body-md text-caption text-on-surface-variant"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {style.steps && style.steps.length > 0 ? (
        <section className="mb-2xl">
          <h2 className="mb-md font-label-md text-label-md uppercase tracking-widest text-primary">
            How to do it
          </h2>
          <ol className="space-y-md">
            {style.steps.map((step, i) => (
              <li key={i} className="flex gap-md">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-md text-caption text-on-primary-fixed">
                  {i + 1}
                </span>
                <p className="pt-0.5 font-body-md text-body-md text-on-surface-variant">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        /* A draft, not an entry. Every style in the library today has
           its steps — this is what an incomplete contribution looks
           like, and the honest thing to show is that it is incomplete
           rather than a button that invents the method. */
        <section className="mb-2xl rounded-2xl border border-dashed border-outline-variant p-lg text-center">
          <p className="mb-md font-body-md text-body-md text-on-surface-variant">
            No step-by-step written for this one yet. The photographs are the whole entry
            until whoever contributed it writes the method up.
          </p>
          <Link
            to="/styles"
            className="inline-flex items-center gap-sm rounded-full bg-primary px-lg py-2 font-label-md text-label-md text-on-primary active:scale-95"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Back to the library
          </Link>
        </section>
      )}
    </>
  )
}
