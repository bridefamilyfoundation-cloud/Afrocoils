import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { styleCover } from '../assets/imagery'
import Icon from '../components/Icon'
import PrototypeImage from '../components/PrototypeImage'
import StyleCard from '../components/StyleCard'
import ScreenFallback from '../components/ScreenFallback'
import type { StyleCategory } from '../content/styles'
import {
  CATEGORY_ICONS,
  STYLES,
  STYLE_CATEGORIES,
  rankStyles,
  styleExclusion,
  styleHairTypes,
} from '../content/styles'
import { useHairProfile } from '../lib/profile-store'
import { deriveLengthBand } from '../lib/growth'
import { resolveLocStage } from '../lib/locs'
import { OCCASIONS, type Occasion } from '../lib/types'

/**
 * The style library, ranked against the hair profile.
 *
 * Saves are backed by `profile.savedStyles`, so a saved look survives
 * navigation and app restarts. Styles that clash with an enforced
 * preference are dropped from the library entirely rather than shown
 * greyed out: a style the app would not suggest has no business sitting
 * in the shelf looking available.
 */

type Filter = StyleCategory | 'All'

/**
 * Only categories the library can actually fill.
 *
 * `STYLE_CATEGORIES` is the full vocabulary and stays that way — a
 * contributor must be able to offer a Maintenance style even though
 * nobody has yet. But a chip that can only ever answer "nothing in this
 * category" is a dead control, and the shelf currently has one.
 */
const FILTERS: Filter[] = [
  'All',
  ...STYLE_CATEGORIES.filter((c) => STYLES.some((s) => s.category === c)),
]

/**
 * Same rule for occasions.
 *
 * Every entry in the library states where it is meant to be worn, and it
 * is often what decides between two styles costing the same half hour —
 * which made it the one useful axis the shelf did not offer. Derived
 * from the library for the same reason as the categories above:
 * "Gym/Active" is in the vocabulary and in nothing on the shelf.
 */
/** The library photo on the recommendations banner. Decoration only. */
const BANNER_STYLE = 'curved-part-afro-bun'

const OCCASION_FILTERS: Occasion[] = OCCASIONS.filter((o) =>
  STYLES.some((s) => s.occasions?.includes(o)),
)

export default function StylesScreen() {
  const { profile, update, ready } = useHairProfile()
  const [active, setActive] = useState<Filter>('All')
  const [occasion, setOccasion] = useState<Occasion | undefined>()

  const { savedStyles, identity, preferences, lengthChecks } = profile
  const locStage = resolveLocStage(identity).stage
  // Read off the Growth tab rather than asked for again here.
  const lengthBand = useMemo(() => deriveLengthBand(lengthChecks), [lengthChecks])

  const filterInput = useMemo(
    () => ({
      hairType: identity.hairType,
      porosity: identity.porosity,
      density: identity.density,
      curlPattern: identity.curlPattern,
      // Stage only gates the loc styles, and only once we know it.
      locStage: identity.hairType === 'Locs' ? locStage : undefined,
      lengthBand,
    }),
    [identity, locStage, lengthBand],
  )

  const ranked = useMemo(
    () => rankStyles(STYLES, filterInput, preferences),
    [filterInput, preferences],
  )

  /*
   * What was dropped, and by what.
   *
   * Counted from the same function that did the dropping, so the header
   * cannot claim a style was hidden by a care preference when it was
   * actually the hair-type filter or a loc stage. Those are three
   * different claims about the world and only one of them is the user's
   * settings talking.
   */
  const dropped = useMemo(() => {
    const counts = { hairType: 0, locStage: 0, preference: 0 }
    for (const style of STYLES) {
      const reason = styleExclusion(style, filterInput, preferences)
      if (reason) counts[reason] += 1
    }
    return counts
  }, [filterInput, preferences])

  function toggleSave(id: string) {
    update({
      savedStyles: savedStyles.includes(id)
        ? savedStyles.filter((s) => s !== id)
        : [...savedStyles, id],
    })
  }

  if (!ready) return <ScreenFallback />

  const visible = ranked.filter(
    (r) =>
      (active === 'All' || r.style.category === active) &&
      (!occasion || r.style.occasions?.includes(occasion)),
  )
  const saved = ranked.filter((r) => savedStyles.includes(r.style.id))
  const forThisHair = identity.hairType
    ? STYLES.filter((s) => styleHairTypes(s).includes(identity.hairType!))
    : STYLES

  /*
   * The disclosure, outside the branch.
   *
   * It used to live inside the "For your hair" shelf, which meant it
   * appeared only when there was something to recommend — and vanished
   * in the one case where a user most needs to be told the library was
   * cut down, namely when nothing ranked at all.
   */
  const notes = [
    dropped.preference > 0 &&
      `${dropped.preference} hidden by your care preferences`,
    dropped.locStage > 0 && `${dropped.locStage} for a different loc stage`,
    dropped.hairType > 0 &&
      `${dropped.hairType} for ${identity.hairType === 'Locs' ? 'loose hair' : 'locs'}`,
  ].filter((n): n is string => typeof n === 'string')

  const filtering = active !== 'All' || occasion !== undefined
  const noun = active === 'All' ? 'styles' : `${active} styles`
  const filterLabel = occasion ? `${noun} for ${occasion.toLowerCase()}` : noun

  return (
    <>
      {/* The reference mockup's search field. It is a way into Ask, the
          same screen the app bar's search icon opens — not a filter over
          this list — so it is a link drawn as a field rather than an
          input that would have to pretend. */}
      <Link
        to="/ask"
        className="mb-lg flex items-center gap-sm rounded-full bg-surface-container-lowest px-lg py-3.5 shadow-card transition-all active:scale-[0.98]"
      >
        <Icon name="search" className="text-on-surface-variant" />
        <span className="font-body-md text-body-md text-on-surface-variant">
          Search styles, care and guides
        </span>
      </Link>

      <section className="mb-lg">
        <h2 className="mb-xs font-headline-lg text-headline-lg-mobile text-on-background">
          Hair Styles
        </h2>
        <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
          The full technique library — every contributed look, browsable by category and
          occasion.
        </p>
      </section>

      {/* The profile-driven half of the library, one tap from the top of
          the general one. It used to be a shelf halfway down this screen,
          which put "everything" and "for you" on the same scroll and made
          the first four cards read as an unexplained repeat of the list
          below them. Drawn as the mockup's promotion banner, with a
          library photo on the right. */}
      <Link
        to="/styles/recommended"
        data-tour="styles-recommended"
        className="relative mb-2xl flex min-h-[9.5rem] overflow-hidden rounded-3xl bg-primary-container text-on-primary-container shadow-card transition-all active:scale-[0.98]"
      >
        <span className="relative z-10 flex w-[62%] flex-col justify-center gap-sm p-lg">
          <span className="block font-headline-md text-headline-md">Recommended for your hair</span>
          <span className="block font-body-md text-caption opacity-90">
            Ranked from your profile, with the criteria it used
          </span>
          <span className="mt-xs inline-flex w-fit items-center gap-xs rounded-full bg-surface-container-lowest px-md py-1.5 font-label-md text-caption font-bold text-on-surface">
            See them
            <Icon name="arrow_forward" className="text-[16px]" />
          </span>
        </span>
        <PrototypeImage
          slot={styleCover(BANNER_STYLE, '')}
          seed={BANNER_STYLE}
          rounded="rounded-none"
          className="absolute inset-y-0 right-0 h-full w-[45%] object-cover object-top [mask-image:linear-gradient(to_right,transparent,black_35%)]"
        />
      </Link>

      {saved.length > 0 && (
        <section className="mb-2xl">
          <h3 className="mb-md font-headline-md text-body-lg font-bold text-on-surface">
            Saved
          </h3>
          <div className="-mx-container-padding flex gap-md overflow-x-auto px-container-padding pb-md">
            {saved.map(({ style }) => (
              <Link
                key={style.id}
                to={`/styles/${style.id}`}
                className="w-40 shrink-0 rounded-2xl bg-surface-container-lowest p-sm shadow-card transition-all active:scale-[0.98]"
              >
                <PrototypeImage
                  slot={styleCover(style.id, style.name)}
                  seed={style.id}
                  icon={CATEGORY_ICONS[style.category]}
                  ratio={[4, 3]}
                  rounded="rounded-xl"
                  className="mb-sm h-28 w-full object-top"
                />
                <p className="px-xs font-label-md text-label-md font-bold text-on-surface">
                  {style.name}
                </p>
                <p className="px-xs font-caption text-caption text-on-surface-variant">
                  {style.minutes} min
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* The library has no loc styles at all, so a loc wearer gets an
          empty shelf. Saying that plainly beats the generic "add your
          porosity" nudge below, which would blame the profile for a gap
          in the content. */}
      {forThisHair.length === 0 && (
        <section className="mb-2xl rounded-2xl bg-secondary-container p-lg">
          <div className="mb-sm flex items-center gap-sm">
            <Icon name="info" className="text-on-secondary-container" />
            <h3 className="font-headline-md text-headline-md text-on-secondary-container">
              No loc styles yet
            </h3>
          </div>
          <p className="mb-md font-body-md text-body-md text-on-secondary-container/90">
            Every style here was contributed by someone who wears it, and nobody has
            contributed a loc style so far. The app will not pad the shelf with loose-hair
            technique to hide that — on locs most of it does damage.
          </p>
          <div className="flex flex-wrap gap-sm">
            <Link
              to="/styles/submit"
              className="inline-block rounded-full bg-on-secondary-container px-lg py-2 font-label-md text-label-md text-secondary-container transition-all active:scale-95"
            >
              Contribute the first one
            </Link>
            <Link
              to="/sos"
              className="inline-block rounded-full border border-on-secondary-container/40 px-lg py-2 font-label-md text-label-md text-on-secondary-container transition-all active:scale-95"
            >
              Loc guides in Hair SOS
            </Link>
          </div>
        </section>
      )}

      {/* Dropped wholesale when the library resolved to nothing for this
          head — a filter bar over an empty shelf is furniture, and the
          notice above has already explained why it is empty. */}
      {ranked.length > 0 && (
        <section className="mb-lg">
          <div className="mb-md flex items-baseline justify-between gap-sm">
            <h3 className="font-headline-md text-body-lg font-bold text-on-surface">
              All styles
            </h3>
            <span className="font-caption text-caption text-on-surface-variant">
              {visible.length} of {ranked.length}
            </span>
          </div>
  
          {notes.length > 0 && (
            <p className="mb-md font-caption text-caption text-on-surface-variant">
              Not shown: {notes.join(' · ')}.
            </p>
          )}
  
          <div
            role="group"
            aria-label="Filter by category"
            className="-mx-container-padding flex gap-sm overflow-x-auto px-container-padding pb-sm"
          >
            {FILTERS.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={active === category}
                onClick={() => setActive(category)}
                className={`shrink-0 whitespace-nowrap rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                  active === category
                    ? 'bg-inverse-surface text-inverse-on-surface'
                    : 'bg-surface-container-lowest text-on-surface shadow-card'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
  
          {/* Second axis. "What can I wear to work" is the question the
              library could answer all along — every entry carries it — and
              could not be asked. Reuses the SOS screen's vocabulary, so it
              means the same thing on both surfaces. */}
          <div
            role="group"
            aria-label="Filter by occasion"
            className="mt-sm flex flex-wrap gap-sm"
          >
            {OCCASION_FILTERS.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={occasion === o}
                onClick={() => setOccasion(occasion === o ? undefined : o)}
                className={`flex items-center gap-xs rounded-full px-md py-1.5 font-label-md text-caption transition-colors active:scale-95 ${
                  occasion === o
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'border border-outline-variant text-on-surface-variant'
                }`}
              >
                <Icon name="checkroom" className="text-[14px]" />
                {o}
              </button>
            ))}
          </div>
        </section>
      )}

      {visible.length > 0 ? (
        <section className="mb-2xl grid grid-cols-2 gap-md sm:grid-cols-3">
          {visible.map((r) => (
            <StyleCard
              key={r.style.id}
              ranked={r}
              saved={savedStyles.includes(r.style.id)}
              onToggle={() => toggleSave(r.style.id)}
            />
          ))}
        </section>
      ) : (
        /* Only when a filter did it. An empty shelf with no filter set is
           the loc case, already explained above — offering "clear
           filters" there would be pointing at a control that cannot
           help. The empty grid used to render regardless, so this line
           also sat under a doubled `mb-2xl` gap. */
        filtering && (
          <section className="mb-2xl rounded-2xl border border-dashed border-outline-variant p-lg text-center">
            <p className="mb-md font-body-md text-body-md text-on-surface-variant">
              No {filterLabel} in the library yet.
            </p>
            <button
              type="button"
              onClick={() => {
                setActive('All')
                setOccasion(undefined)
              }}
              className="rounded-full bg-surface-container-high px-lg py-2 font-label-md text-label-md text-on-surface active:scale-95"
            >
              Clear filters
            </button>
          </section>
        )
      )}

      {/* The way in. Sits at the foot of the library rather than in the
          drawer: contributing is something you do to the shelf while you
          are looking at it, and the shelf is where you notice the gap. */}
      <section className="mb-2xl rounded-2xl border border-dashed border-outline-variant bg-surface-container/50 p-xl text-center">
        <Icon name="add_photo_alternate" className="mb-sm text-3xl text-outline" />
        <h3 className="mb-sm font-headline-md text-headline-md text-on-surface">
          Every style here came from someone
        </h3>
        <p className="mx-auto mb-lg max-w-sm font-body-md text-body-md text-on-surface-variant">
          The whole library is contributed — written up by the people who wear these. The pictures
          are illustrations of what they wrote. If you have one the shelf is missing, add it.
        </p>
        <Link
          to="/styles/submit"
          className="inline-flex items-center gap-sm rounded-full bg-primary px-xl py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
        >
          <Icon name="arrow_upward" className="text-[18px]" />
          Share a style
        </Link>
      </section>
    </>
  )
}
