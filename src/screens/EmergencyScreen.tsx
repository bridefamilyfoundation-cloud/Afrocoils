import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { AfroMark } from '../components/BrandMark'
import Icon, { type IconName } from '../components/Icon'
import { isLocs } from '../lib/locs'
import { useHairProfile } from '../lib/profile-store'

/**
 * Hair SOS — the front page and the section, at `/`, `/home` and `/sos`.
 *
 * These were two screens. `/` was a wordless cover — title, illustration,
 * Get Started — outside `AppLayout`, and `/sos` was the triage behind it.
 * Splitting them meant every launch spent a tap on a page with one
 * target, on an app people reach for mid-problem, and left the drawer
 * with a "Home" that was not any of the sections. They are one page now:
 * the illustration and Get Started fill the first screen, the three
 * doors are directly below, and Get Started scrolls rather than
 * navigates.
 *
 * It sits *inside* `AppLayout`, unlike the old front page. Landing
 * somewhere with no app bar and no tab bar meant the only way into
 * Styles, Care, Growth or Profile was through a door, and the tab bar
 * blinking out on the launch screen and back in everywhere else read as
 * a glitch rather than as focus.
 *
 * Two doors and nothing else below the fold. The screen used to be the
 * whole rescue flow on one page — a time filter, a guide list, concern
 * chips, featured cards, two tests and a shelf of shortcuts — which
 * asked someone mid-problem to read the entire app before doing
 * anything. The two questions below are what is left:
 *
 * - **Quick Hairstyle** — "I have twenty minutes and I need to look
 *   presentable." Filters the library by the time you have.
 * - **Hair Care** — "What is my hair, and what should I be doing for
 *   it?" The door stays here because the question is one people arrive
 *   with, but the screen behind it is its own section at `/care` rather
 *   than a child of this one.
 *
 * There was a third — **Hair Problem**, the Quick Hair Check and the
 * care guides reached from the symptom rather than the title. It was
 * removed from this page deliberately. `/sos/problem` still renders and
 * is still linked from Locs World and from the crumb on every guide, so
 * nothing behind it was deleted, but this screen no longer opens it.
 *
 * Keep it short either way. A triage screen with six options is a menu,
 * and a menu is the thing this replaced.
 */
const DOORS: {
  to: string
  icon: IconName
  title: string
  body: string
  theme: string
}[] = [
  {
    to: '/sos/quick',
    icon: 'schedule',
    title: 'Quick Hairstyle',
    body: 'You have somewhere to be. Pick the time you have and see what fits it.',
    theme: 'bg-primary-container text-on-primary-container',
  },
  {
    to: '/care',
    icon: 'spa',
    title: 'Hair Care',
    body: 'Know your hair, build a routine, and find the products and styles that suit it.',
    theme: 'bg-secondary-container text-on-secondary-container',
  },
]

export default function EmergencyScreen() {
  const { profile, completeness, ready } = useHairProfile()
  const locs = isLocs(profile.identity)
  const doors = useRef<HTMLElement>(null)

  return (
    <>
      {/* The hero takes the first screen. The height is the viewport less
          the app bar above and the tab bar below, so Get Started lands at
          the foot of what you can see rather than under it. */}
      <section className="flex min-h-[calc(100svh-15rem)] flex-col items-center justify-center gap-xl">
        <h1 className="text-center font-display-lg text-display-lg text-primary">Hair SOS</h1>
        <AfroMark variant="hero" title="Afrocoil" className="w-full max-w-[80vw] sm:max-w-md" />
      </section>

      {/* Scrolls rather than navigates — the doors are on this page now.
          The orange is the brand's action colour and this is still the
          only action up here. White on it is 3.6:1, which is why the
          label is set large and bold rather than at body weight. */}
      <div className="mb-2xl mt-lg">
        <button
          type="button"
          onClick={() => doors.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="mx-auto block w-full max-w-md rounded-full bg-secondary py-4 text-center font-label-md text-body-lg text-on-secondary shadow-lg transition-all active:scale-95"
        >
          Get Started
        </button>
      </div>

      {/* scroll-mt clears the fixed app bar when Get Started lands here. */}
      <section ref={doors} className="mb-xl scroll-mt-24 text-center">
        <h2 className="mb-sm font-headline-lg text-headline-lg text-on-background">
          What&rsquo;s Your Emergency?
        </h2>
        <p className="mx-auto max-w-md font-body-md text-on-surface-variant">
          Two ways in. Everything behind them is written down and on this phone, so it
          works with no signal.
        </p>
      </section>

      <section data-tour="sos-doors" className="mb-2xl space-y-md">
        {DOORS.map((door) => (
          <Link
            key={door.to}
            to={door.to}
            className={`flex items-center gap-lg rounded-2xl p-xl transition-all active:scale-[0.98] ${door.theme}`}
          >
            <Icon name={door.icon} className="shrink-0 text-3xl" />
            <span className="min-w-0 flex-1">
              <span className="mb-xs block font-headline-md text-headline-md">{door.title}</span>
              <span className="block font-body-md text-body-md opacity-90">{door.body}</span>
            </span>
            <Icon name="arrow_forward" className="shrink-0 opacity-70" />
          </Link>
        ))}
      </section>

      {/* Not another door — a short list is what makes this triage. A loc
          wearer's reference lives in its own section, and this is the
          pointer to it, shown only to the people it is for.

          Gated on `ready` with everything else below: the store hands
          out an empty profile until the disk read resolves, so without
          it this card was absent on first paint and popped in a beat
          later, moving the doors under a thumb already reaching for
          one. */}
      {ready && locs && (
        <Link
          to="/locs"
          className="mb-2xl flex items-center gap-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg transition-all active:scale-[0.98]"
        >
          <Icon name="waves" className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-headline-md text-body-lg text-on-surface">
              Locs World
            </span>
            <span className="block font-body-md text-caption text-on-surface-variant">
              Understand, start, maintain and care for your locs.
            </span>
          </span>
          <Icon name="arrow_forward" className="shrink-0 text-outline" />
        </Link>
      )}

      {/* The one thing worth interrupting the doors for: without a hair
          type, every list behind them is generic. Shown only while that
          is true — and only once the profile has actually been read.

          `ready` is not cosmetic here. `completeness` is 0 until the
          disk read resolves, so every launch used to open by telling a
          user who finished the quiz weeks ago that nothing was
          personalised yet, then take it back. This is the screen every
          launch lands on; it cannot open on a claim it is about to
          withdraw. */}
      {ready && completeness < 1 && (
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-lg text-center">
          <p className="mb-md font-body-md text-body-md text-on-surface-variant">
            {completeness === 0
              ? 'Nothing here is personalised until the app knows whether you have loose hair or locs. That one answer changes half of it.'
              : `Your profile is ${Math.round(completeness * 100)}% filled in — the rest sharpens everything above.`}
          </p>
          <Link
            to="/quiz"
            className="inline-flex items-center gap-sm rounded-full bg-primary px-xl py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
          >
            <Icon name="science" className="text-[18px]" />
            {completeness === 0 ? 'Take the hair quiz' : 'Finish the quiz'}
          </Link>
        </section>
      )}
    </>
  )
}
