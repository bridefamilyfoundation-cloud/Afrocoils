import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { styleCover } from '../assets/imagery'
import { AfroMark } from '../components/BrandMark'
import Icon, { type IconName } from '../components/Icon'
import PrototypeImage from '../components/PrototypeImage'
import { MEMBER_SECTIONS } from '../content/membership'
import { STYLES } from '../content/styles'
import { isLocs } from '../lib/locs'
import { hasAccess } from '../lib/membership'
import { useHairProfile } from '../lib/profile-store'

/**
 * Hair SOS — the front page and the section, at `/`, `/home` and `/sos`.
 *
 * These were two screens. `/` was a wordless cover — title, illustration,
 * Get Started — outside `AppLayout`, and `/sos` was the triage behind it.
 * Splitting them meant every launch spent a tap on a page with one
 * target, on an app people reach for mid-problem, and left the drawer
 * with a "Home" that was not any of the sections. They are one page now:
 * the question fills the first screen and the doors are directly below.
 *
 * Since 2026-11-20 (on request) the first screen *is* the question —
 * "What's your emergency?" on a frosted-glass panel, a heartbeat pulse
 * and trace (`.sos-beat`, `.sos-trace` in index.css, off under reduced
 * motion), and the library photos faded behind it as a backdrop. Get
 * Started goes straight to Hair Care; "Need a quick style?" scrolls to
 * the doors, where Quick Hairstyle is.
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
 *
 * The photos are the generated ones the library already ships (see the
 * images README), and they are decoration — hidden from screen readers
 * and not links, so the first screen still has one main target.
 */

/** Three library entries whose front shots carry the collage, tall one first. */
const COLLAGE = ['afro-donut-bun', 'flat-twist-front-afro', 'crossed-twist-crown']

/** The four-point star from the mockup, drawn rather than an icon-font glyph. */
function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" />
    </svg>
  )
}
const DOORS: {
  to: string
  icon: IconName
  title: string
  body: string
  /** The disc behind the icon. The card itself is white for both. */
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
  // Locked (no paid membership): the same first screen, then what the
  // app holds, described rather than linked, and the way to join.
  const open = hasAccess(profile.membership)

  return (
    <>
      {/* The hero takes the first screen: the question, on frosted glass,
          over the library's photos faded into a background. The height is
          the viewport less the app bar above and the tab bar below, so the
          button lands at the foot of what you can see. */}
      <section className="relative mb-lg flex min-h-[calc(100svh-13rem)] flex-col justify-end overflow-hidden rounded-[2rem] shadow-card">
        {/* The collage, now a backdrop: decoration, hidden from screen
            readers and not links, so the first screen keeps one target.
            It drifts very slowly, which is most of what makes the glass
            read as glass. */}
        <div aria-hidden className="absolute inset-0">
          <div className="sos-glow grid h-full w-full grid-cols-[1.4fr_1fr] grid-rows-2 gap-1 opacity-50 blur-[3px] saturate-[0.85]">
            {COLLAGE.map((id, i) => {
              const style = STYLES.find((s) => s.id === id)
              return (
                <PrototypeImage
                  key={id}
                  slot={styleCover(id, style?.name ?? '')}
                  seed={id}
                  rounded="rounded-none"
                  className={`h-full w-full object-cover object-top ${i === 0 ? 'row-span-2' : ''}`}
                />
              )
            })}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-surface-container-low/25 via-surface-container-low/45 to-surface-container-low/90" />
        </div>

        <Sparkle className="absolute left-md top-md h-8 w-8 text-tertiary opacity-80" />

        <div className="relative m-sm rounded-[1.6rem] bg-surface-container-lowest/45 p-lg ring-1 ring-surface-container-lowest/70 backdrop-blur-xl">
          <div className="mb-md flex items-center justify-between gap-md">
            <span className="flex items-center gap-sm">
              {/* The heartbeat: the mark beats twice and rests, the ring
                  spreads once per beat. */}
              <span aria-hidden className="relative flex h-11 w-11 items-center justify-center">
                <span className="sos-ring absolute inset-0 rounded-full bg-secondary/40" />
                <span className="sos-beat relative flex h-11 w-11 items-center justify-center rounded-full bg-secondary font-label-md text-caption font-bold tracking-wider text-on-secondary">
                  SOS
                </span>
              </span>
              <span className="font-label-md text-caption uppercase tracking-[0.2em] text-on-surface">
                Hair SOS
              </span>
            </span>
            <AfroMark variant="mark" className="w-10 shrink-0 opacity-90" />
          </div>

          <h1 className="font-display-lg text-display-lg leading-[1.05] text-tertiary">
            What&rsquo;s your emergency?
          </h1>

          {/* The trace. pathLength="1" lets one dash cover the whole line
              whatever its drawn length, so the CSS can draw it 0 → 1. */}
          <svg
            aria-hidden
            viewBox="0 0 300 40"
            preserveAspectRatio="none"
            className="my-md h-10 w-full text-secondary"
          >
            <path
              d="M0 22 H96 L108 22 L116 8 L126 36 L138 2 L150 30 L158 22 H300"
              pathLength="1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sos-trace"
            />
          </svg>

          <p className="mb-lg max-w-[18rem] font-body-md text-body-md text-on-surface-variant">
            Quick styles and real care, for the moment your hair can&rsquo;t wait.
          </p>

          {/* Members go straight to Hair Care — knowing your hair and what
              to do about it. Quick Hairstyle is the second door, below. */}
          {open ? (
            <div className="flex flex-wrap items-center justify-between gap-md">
              {/* A loc wearer's reference is Locs World, not general care:
                  filing locs under Hair Care is how loose-hair technique
                  ends up in front of someone it would damage. */}
              <Link
                to={locs ? '/locs' : '/care'}
                className="flex items-center gap-md rounded-full bg-inverse-surface py-1.5 pl-lg pr-1.5 font-label-md text-body-md font-semibold text-inverse-on-surface shadow-float transition-all active:scale-95"
              >
                Get Started
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary">
                  <Icon name="arrow_forward" />
                </span>
              </Link>
              <button
                type="button"
                onClick={() => doors.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="font-label-md text-caption text-primary underline underline-offset-4"
              >
                Need a quick style?
              </button>
            </div>
          ) : (
            <Link
              to="/join"
              className="inline-flex items-center gap-md rounded-full bg-inverse-surface py-1.5 pl-lg pr-1.5 font-label-md text-body-md font-semibold text-inverse-on-surface shadow-float transition-all active:scale-95"
            >
              Explore more features
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary">
                <Icon name="arrow_forward" />
              </span>
            </Link>
          )}
        </div>
      </section>

      {!open && (
        <>
          <section className="mb-lg mt-2xl text-center">
            <h2 className="mb-sm font-headline-lg text-headline-lg text-on-background">
              Inside AfroCoils
            </h2>
            <p className="mx-auto max-w-md font-body-md text-on-surface-variant">
              A guide to Type 4 hair, loose or loc&rsquo;d, written by people and kept on your phone so
              it works with no signal. Six sections, for members.
            </p>
          </section>
          <ul className="mb-xl space-y-sm">
            {MEMBER_SECTIONS.map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-md rounded-2xl bg-surface-container-lowest p-md shadow-card"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                  <Icon name={item.icon} className="text-[24px]" />
                </span>
                <span>
                  <span className="block font-headline-md text-body-lg font-bold text-on-surface">
                    {item.title}
                  </span>
                  <span className="block font-body-md text-caption text-on-surface-variant">
                    {item.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mb-xl text-center">
            <Link
              to="/join"
              className="inline-flex items-center gap-sm rounded-full bg-secondary px-xl py-4 font-label-md text-body-lg font-bold text-on-secondary shadow-card transition-all active:scale-95"
            >
              Explore more features
              <Icon name="arrow_forward" className="text-[20px]" />
            </Link>
            {/* Signed in and locked is not "already a member? sign in". */}
            <p className="mt-md font-body-md text-caption text-on-surface-variant">
              {profile.membership ? (
                <>
                  Signed in as {profile.membership.email}.{' '}
                  <Link to="/join" className="text-primary underline">
                    Choose a plan
                  </Link>
                </>
              ) : (
                <>
                  Already a member?{' '}
                  <Link to="/join" className="text-primary underline">
                    Sign in with your email
                  </Link>
                </>
              )}
            </p>
          </div>
        </>
      )}

      {open && (
        <>
          {/* scroll-mt clears the fixed app bar when “Need a quick style?” lands here. */}
          <section ref={doors} className="mb-xl mt-2xl scroll-mt-24 text-center">
            <h2 className="mb-sm font-headline-lg text-headline-lg text-on-background">
              Two ways in
            </h2>
            <p className="mx-auto max-w-md font-body-md text-on-surface-variant">
              Everything behind them is written down and on this phone, so it works with no
              signal.
            </p>
          </section>

          <section data-tour="sos-doors" className="mb-2xl space-y-md">
            {DOORS.map((door) => (
              <Link
                key={door.to}
                to={door.to}
                className="flex items-center gap-md rounded-2xl bg-surface-container-lowest p-md shadow-card transition-all active:scale-[0.98]"
              >
                <span
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${door.theme}`}
                >
                  <Icon name={door.icon} className="text-3xl" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="mb-xs block font-headline-md text-body-lg font-bold text-on-surface">
                    {door.title}
                  </span>
                  <span className="block font-body-md text-caption text-on-surface-variant">
                    {door.body}
                  </span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
                  <Icon name="arrow_forward" className="text-[20px]" />
                </span>
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
              className="mb-2xl flex items-center gap-md rounded-xl shadow-card bg-surface-container-lowest p-lg transition-all active:scale-[0.98]"
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
            <section className="rounded-2xl shadow-card bg-surface-container-lowest p-lg text-center">
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
                {completeness === 0 ? 'Start Hair Discovery' : 'Finish Hair Discovery'}
              </Link>
            </section>
          )}
        </>
      )}
    </>
  )
}
