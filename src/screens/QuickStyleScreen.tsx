import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { styleCover } from '../assets/imagery'
import Icon from '../components/Icon'
import PrototypeImage from '../components/PrototypeImage'
import SectionCrumb from '../components/SectionCrumb'
import { CATEGORY_ICONS, STYLES, rankStyles } from '../content/styles'
import { deriveLengthBand } from '../lib/growth'
import { isLocs, resolveLocStage } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'
import { TIME_BANDS, type TimeBand } from '../lib/types'

/**
 * Quick Hairstyle, at `/sos/quick`.
 *
 * One question — how long have you got — answered out of the style
 * library that ships with the app. Nothing is generated: every entry was
 * written up and photographed by the person who wore it, and the steps
 * on the detail screen are theirs.
 *
 * The ranking is `rankStyles`, the same function the Styles tab uses, so
 * the two surfaces cannot disagree about what suits this hair. This is
 * that list with a clock held against it, not a second opinion.
 */
export default function QuickStyleScreen() {
  const { profile } = useHairProfile()
  const locs = isLocs(profile.identity)
  const [band, setBand] = useState<TimeBand>(TIME_BANDS[0])

  const fits = useMemo(
    () =>
      rankStyles(
        STYLES.filter((style) => style.minutes >= band.min && style.minutes <= band.max),
        {
          hairType: profile.identity.hairType,
          porosity: profile.identity.porosity,
          density: profile.identity.density,
          curlPattern: profile.identity.curlPattern,
          locStage: resolveLocStage(profile.identity).stage,
          // Derived from the last length check rather than asked for, and
          // it ranks rather than excludes.
          lengthBand: deriveLengthBand(profile.lengthChecks),
        },
        profile.preferences,
      ),
    [band, profile],
  )

  return (
    <>
      <SectionCrumb to="/sos" label="Hair SOS" />

      <section className="mb-xl">
        <h2 className="mb-sm font-headline-lg text-headline-lg text-on-background">
          Quick Hairstyle
        </h2>
        <p className="font-body-md text-on-surface-variant">
          How long have you got? The list is ranked against your hair profile, shortest
          first.
        </p>
      </section>

      <section className="mb-lg flex flex-wrap gap-sm">
        {TIME_BANDS.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={band.label === option.label}
            onClick={() => setBand(option)}
            className={`rounded-full px-lg py-2 font-label-md text-label-md transition-colors ${
              band.label === option.label
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            {option.label}
          </button>
        ))}
      </section>

      {fits.length > 0 ? (
        <section className="mb-2xl">
          <p className="mb-md font-caption text-caption text-on-surface-variant">
            {fits.length} {fits.length === 1 ? 'style fits' : 'styles fit'} {band.label}
          </p>
          <div className="space-y-sm">
            {fits.map(({ style, reasons }) => (
              <Link
                key={style.id}
                to={`/styles/${style.id}`}
                className="flex items-center gap-md rounded-xl shadow-card bg-surface-container-lowest p-md transition-all active:scale-[0.98]"
              >
                <PrototypeImage
                  slot={styleCover(style.id, style.name)}
                  seed={style.id}
                  icon={CATEGORY_ICONS[style.category]}
                  ratio={[1, 1]}
                  className="h-20 w-20 shrink-0 object-top"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-headline-md text-body-lg text-on-surface">{style.name}</h3>
                  <p className="mb-xs font-caption text-caption text-on-surface-variant">
                    {style.minutes} min · {style.difficulty} · {style.category}
                  </p>
                  {reasons.length > 0 && (
                    <p className="font-caption text-caption text-primary">{reasons[0]}</p>
                  )}
                </div>
                <Icon name="arrow_forward" className="shrink-0 text-outline" />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        /* Said plainly, and without blaming the user's profile for it.
           The library is contributed content and nothing in it is a loc
           style yet, so for a loc wearer this is empty however much of
           the profile they fill in. */
        <section className="mb-2xl rounded-2xl bg-surface-container p-xl">
          <p className="font-body-md text-body-md text-on-surface-variant">
            {locs
              ? 'The style library is contributed by the people who wore each look, and nothing in it is a loc style yet — so there is nothing to put here. Hair Problem has the guides written for locs.'
              : `Nothing in the library lands in ${band.label}. Try another slot.`}
          </p>
        </section>
      )}

      <p className="mb-2xl text-center font-caption text-caption text-on-surface-variant">
        Every step comes from the contributor who wore the style. The pictures are generated
        illustrations; the steps are not.
      </p>
    </>
  )
}
