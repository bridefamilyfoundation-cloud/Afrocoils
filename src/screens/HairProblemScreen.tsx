import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IMAGERY } from '../assets/imagery'
import Icon from '../components/Icon'
import PrototypeImage from '../components/PrototypeImage'
import QuickHairCheck from '../components/QuickHairCheck'
import SectionCrumb from '../components/SectionCrumb'
import { guidesFor, searchGuides } from '../content/guides'
import { isLocs } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'

/**
 * Hair Problem, at `/sos/problem`.
 *
 * The care guides, reached from the symptom rather than the title —
 * nobody arrives knowing they want "Protein and Moisture", they arrive
 * because their hair snaps when they comb it.
 *
 * Everything on this screen is prose somebody wrote, filtered by hair
 * type. That filter is not cosmetic: most loose-hair technique is
 * destructive on locs, so a loc wearer must never be handed a
 * detangling guide.
 */

export default function HairProblemScreen() {
  const navigate = useNavigate()
  const { profile } = useHairProfile()
  const locs = isLocs(profile.identity)

  const guides = useMemo(() => guidesFor(profile.identity.hairType), [profile.identity.hairType])

  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim()
    return q ? searchGuides(guides, q) : undefined
  }, [guides, query])

  const shown = matches ?? (showAll ? guides : guides.slice(0, 4))

  return (
    <>
      <SectionCrumb to="/sos" label="Hair SOS" />

      <section className="mb-xl">
        <h2 className="mb-sm font-headline-lg text-headline-lg text-on-background">
          Hair Problem
        </h2>
        <p className="font-body-md text-on-surface-variant">
          Start from what is wrong. Everything here is written for{' '}
          {locs ? 'locs' : 'loose coils'}.
        </p>
      </section>

      {/* Symptom first, before the written guides: the label is the
          thing the user would say out loud, and the panel behind it
          answers it without them having to pick a guide title. */}
      <QuickHairCheck />

      {/* Featured rescues. The hero and its companions change with hair
          type: sending a loc wearer to a detangling guide is not a
          neutral mismatch, it is advice that would damage their hair. */}
      <section className="mb-2xl grid grid-cols-1 gap-lg md:grid-cols-12">
        <div className="group relative flex flex-col items-center gap-lg overflow-hidden rounded-xl bg-primary-fixed p-xl md:col-span-8 md:flex-row">
          <div className="z-10 flex-1">
            <span className="mb-md inline-block rounded-full bg-secondary px-3 py-1 font-label-md text-caption uppercase text-on-secondary">
              Urgent Care
            </span>
            <h3 className="mb-sm font-headline-md text-headline-md text-primary">
              {locs ? 'Dry, Brittle Locs' : 'Dryness Rescue'}
            </h3>
            <p className="mb-lg font-body-md text-body-md text-on-primary-fixed-variant">
              {locs
                ? 'Locs dry out from the inside where you cannot see it, and reaching for more product usually makes it worse. Water first.'
                : 'When your coils feel like straw, it’s time for the L.O.C. method intensive. Bring back the bounce in 20 minutes.'}
            </p>
            <button
              type="button"
              onClick={() => navigate(locs ? '/guide/loc-dryness' : '/guide/dryness-rescue')}
              className="flex items-center gap-sm rounded-full bg-primary px-xl py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
            >
              Start Ritual
              <Icon name="arrow_forward" className="text-[18px]" />
            </button>
          </div>

          <PrototypeImage
            slot={locs ? IMAGERY.locDryness : IMAGERY.drynessRescue}
            className="h-64 w-full shadow-lg transition-transform md:w-64"
          />
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-tertiary/10 bg-tertiary-fixed p-lg md:col-span-4">
          <div>
            <div className="mb-lg flex h-12 w-12 items-center justify-center rounded-full bg-tertiary text-on-tertiary">
              <Icon name="spa" />
            </div>
            <h3 className="mb-sm font-headline-md text-headline-md text-on-tertiary-fixed">
              Scalp Relief
            </h3>
            <p className="font-body-md text-body-md text-on-tertiary-fixed-variant">
              {locs
                ? 'Reaching the scalp through a full head of locs is most of the battle. Here is how.'
                : 'Soothe irritation and itchiness with our botanical guide to scalp health.'}
            </p>
          </div>
          <div className="mt-lg border-t border-tertiary/20 pt-lg">
            <button
              type="button"
              onClick={() => navigate('/guide/scalp-relief')}
              className="flex items-center gap-xs font-label-md text-label-md text-tertiary"
            >
              View Remedies
              <Icon name="open_in_new" className="text-[16px]" />
            </button>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-secondary-fixed p-lg md:col-span-5">
          <button
            type="button"
            onClick={() => navigate(locs ? '/guide/loc-retwist' : '/guide/detangling-magic')}
            className="absolute inset-0 z-20"
            aria-label={locs ? 'Open the retwist guide' : 'Open the Detangling Magic guide'}
          />
          <div className="z-10">
            <h3 className="mb-sm font-headline-md text-headline-md text-on-secondary-fixed">
              {locs ? 'Retwist Without Damage' : 'Detangling Magic'}
            </h3>
            <p className="font-body-md text-body-md text-on-secondary-fixed-variant">
              {locs
                ? 'Root maintenance is where locs are most often damaged, and always in the same two ways: too tight, and too often.'
                : 'Don’t reach for the scissors. Our slip-intensive guide helps you melt those knots away with patience and the right tools.'}
            </p>
          </div>
          <Icon
            name="auto_awesome"
            className="absolute -bottom-4 -right-4 rotate-12 text-9xl text-on-secondary-fixed/5"
          />
        </div>

        <div className="flex items-center gap-lg rounded-xl bg-surface-container p-lg md:col-span-7">
          <PrototypeImage
            slot={locs ? IMAGERY.locStages : IMAGERY.stopTheSnap}
            className="hidden h-32 w-32 flex-shrink-0 sm:block"
          />
          <div>
            <h3 className="mb-sm font-headline-md text-headline-md text-on-surface">
              {locs ? 'Which Stage Are You?' : 'Stop the Snap'}
            </h3>
            <p className="mb-md font-body-md text-body-md text-on-surface-variant">
              {locs
                ? 'Starter, budding, teen, mature. Nearly every piece of loc advice depends on which one you are in.'
                : 'Noticing more hair on the floor? Let’s check your protein-moisture balance.'}
            </p>
            <button
              type="button"
              onClick={() => navigate(locs ? '/guide/loc-starter-care' : '/porosity')}
              className="rounded-full border border-primary px-lg py-2 font-label-md text-label-md text-primary transition-colors active:scale-95"
            >
              {locs ? 'Read the stage guide' : 'Take the Porosity Test'}
            </button>
          </div>
        </div>
      </section>

      {/* Every guide, searchable. The box sits with the list it filters:
          a search field further up the screen reads as a search of the
          whole app. */}
      <section className="mb-2xl">
        <h3 className="mb-md font-headline-md text-body-lg font-bold text-on-surface">
          All care guides
        </h3>

        <div className="relative mb-md">
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline"
          />
          <label htmlFor="guide-search" className="sr-only">
            Search the care guides
          </label>
          <input
            id="guide-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={80}
            placeholder="Search the guides (e.g. 'itchy scalp', 'buildup')…"
            className="w-full rounded-full border-none bg-surface-container-low py-4 pl-12 pr-4 font-body-md text-body-md text-on-surface shadow-sm transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {matches?.length === 0 ? (
          <p className="rounded-xl bg-surface-container p-lg text-center font-body-md text-body-md text-on-surface-variant">
            No guide matches “{query.trim()}”. The concerns above cover what most people
            arrive with.
          </p>
        ) : (
          <div className="space-y-sm">
            {shown.map((guide) => (
              <Link
                key={guide.slug}
                to={`/guide/${guide.slug}`}
                className="flex items-center gap-md rounded-xl shadow-card bg-surface-container-lowest p-md transition-all active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
                  <Icon name={guide.icon} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-headline-md text-body-lg text-on-surface">{guide.title}</h4>
                  <p className="font-caption text-caption text-on-surface-variant">
                    {guide.minutes} min read
                  </p>
                </div>
                <Icon name="arrow_forward" className="shrink-0 text-outline" />
              </Link>
            ))}
          </div>
        )}

        {!matches && guides.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="mt-md flex w-full items-center justify-center gap-xs rounded-full bg-surface-container-high py-2 font-label-md text-caption text-on-surface active:scale-95"
          >
            {showAll ? 'Show fewer' : `All ${guides.length} guides for your hair`}
            <Icon name={showAll ? 'expand_less' : 'expand_more'} className="text-[16px]" />
          </button>
        )}
      </section>

      {/* There is no expert on the other end of a button in this app and
          never was, so this points at the two things that are real. */}
      <section className="relative overflow-hidden rounded-2xl bg-primary-container p-xl text-center text-on-primary-container">
        <h3 className="mb-md font-headline-md text-headline-md">Still not sure?</h3>
        <p className="mb-xl font-body-md text-body-md opacity-90">
          Read what the community has worked out between them, or tell us what you came
          looking for and could not find.
        </p>
        <div className="flex flex-col justify-center gap-md sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/about')}
            className="rounded-full bg-on-primary-container px-2xl py-4 font-label-md text-label-md text-primary-container transition-all active:scale-95"
          >
            Read the collected tips
          </button>
          <button
            type="button"
            onClick={() => navigate('/legal/contact')}
            className="rounded-full border border-on-primary-container/30 px-2xl py-4 font-label-md text-label-md transition-all active:scale-95"
          >
            Contact us
          </button>
        </div>
      </section>
    </>
  )
}
