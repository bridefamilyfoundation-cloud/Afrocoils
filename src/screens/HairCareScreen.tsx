import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import { deriveDue, relativeDay, sortByUrgency } from '../lib/calendar'
import { useHairProfile } from '../lib/profile-store'
import { curlFamilyOf, curlPatternLabel } from '../lib/types'

/**
 * Hair Care, at `/care`. A section of its own.
 *
 * The "what is my hair and what should I do for it" screen, as four
 * things in the order they depend on each other: know what you have,
 * put it on a schedule, then buy and wear accordingly. Products before
 * porosity is how people end up with a shelf of things that do not suit
 * them.
 *
 * It briefly lived inside Hair Growth, on the reasoning that these are
 * the causes of the retention that screen measures. In practice it made
 * one very long page out of two jobs — someone opening Growth to log a
 * length check had to scroll past seven cards to reach it — so the two
 * are separate again.
 *
 * Every card here opens a screen that already exists. This is a hub, not
 * a fifth copy of the profile pickers — `identity` is written in exactly
 * two places (the quiz and the profile screen), and adding a third would
 * be a third thing to keep in step with `identityFieldsFor()`.
 */

/** B, C, D and E. A is the four traits below, which need the profile read. */
const ROUTES: {
  to: string
  icon: IconName
  letter: string
  title: string
  body: string
}[] = [
  {
    to: '/calendar',
    icon: 'calendar_month',
    letter: 'B',
    title: 'Hair routine',
    body: 'Wash days, deep conditioning, protein, retwists. Set a cadence and the app works out what is next.',
  },
  {
    to: '/products',
    icon: 'storefront',
    letter: 'C',
    title: 'Product recommendations',
    body: 'A short shelf for coily hair and locs, filtered to your porosity, your preferences and your water.',
  },
  {
    to: '/styles/recommended',
    icon: 'auto_awesome',
    letter: 'D',
    title: 'Hairstyle recommendations',
    body: 'Styles ranked from your profile, and the criteria that did the ranking. The full library is on the Hair Styles tab.',
  },
  /*
   * The way in to `/sos/problem`, and currently the only one.
   *
   * Hair SOS used to carry a Hair Problem door and no longer does, which
   * left the Quick Hair Check and every care guide reachable only from a
   * crumb inside a guide you could not get to, and from a pointer on
   * Locs World that only loc wearers see. Its home is here rather than
   * back on the front page: "something is wrong with my hair" is the
   * same question as the four traits above — what have I got and what
   * should I do about it — and this keeps the triage screen at two
   * doors.
   */
  {
    to: '/sos/problem',
    icon: 'warning',
    letter: 'E',
    title: 'Something is wrong',
    body: 'Dryness, an itchy scalp, buildup, breakage. Start from the symptom and read what it usually is.',
  },
]

export default function HairCareScreen() {
  const { profile } = useHairProfile()
  const { identity } = profile

  /**
   * The four traits people mean by "know your hair".
   *
   * Each says what the app currently has, so the card is an answer where
   * there is one and a prompt where there is not — a row that only ever
   * says "set this" cannot tell you that you already did.
   */
  const traits: { label: string; value?: string; to: string; action: string; note: string }[] = [
    {
      label: 'Hair porosity',
      value: identity.porosity,
      to: '/porosity',
      action: identity.porosity ? 'Re-take the test' : 'Take the test',
      note: 'How readily your hair takes water in and lets it go. Drives almost every product decision.',
    },
    {
      label: 'Hair density',
      value: identity.density,
      to: '/profile',
      action: identity.density ? 'Change it' : 'Set it',
      note: 'How much hair is on your head, not how thick each strand is. Decides sectioning and product quantity.',
    },
    {
      label: 'Curl pattern',
      value:
        identity.curlPattern &&
        `${curlPatternLabel(identity.curlPattern)} · ${curlFamilyOf(identity.curlPattern)?.name ?? ''}`.trim(),
      to: '/profile',
      action: identity.curlPattern ? 'Change it' : 'Set it',
      note: 'The shape of a strand — Type 1 straight through Type 4 coily. It still matters with locs: it decides how fast they bud and shrink.',
    },
    {
      label: 'Hair texture',
      value: identity.texture,
      to: '/profile',
      action: identity.texture ? 'Change it' : 'Set it',
      note: 'How thick or wide a single strand is. Fine strands are weighed down by heavy products; coarse ones usually need them.',
    },
  ]

  // The most urgent thing the calendar knows about, so the routine card
  // says something true rather than advertising itself.
  const due = sortByUrgency(deriveDue(profile.schedules, profile.careEvents)).filter(
    (status) => status.dueKey !== undefined,
  )[0]

  return (
    <>
      <section data-tour="care-heading" className="mb-xl">
        <h2 className="mb-sm font-headline-lg text-headline-lg-mobile text-on-background">
          Hair Care
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          What your hair is, what it needs on a schedule, and what to put on it.
        </p>
      </section>

      {/* A — know your hair */}
      <section className="mb-2xl">
        <h3 className="mb-md font-label-md text-label-md uppercase tracking-widest text-primary">
          A · Know your hair
        </h3>
        <div className="space-y-sm">
          {traits.map((trait) => (
            <Link
              key={trait.label}
              to={trait.to}
              className="flex items-start gap-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg transition-all active:scale-[0.98]"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-xs flex flex-wrap items-baseline gap-sm">
                  <h4 className="font-headline-md text-body-lg text-on-surface">{trait.label}</h4>
                  {trait.value ? (
                    <span className="rounded-full bg-secondary-container px-3 py-0.5 font-label-md text-caption text-on-secondary-container">
                      {trait.value}
                    </span>
                  ) : (
                    <span className="font-caption text-caption text-outline">not set</span>
                  )}
                </div>
                <p className="mb-sm font-body-md text-caption text-on-surface-variant">
                  {trait.note}
                </p>
                <span className="flex items-center gap-xs font-label-md text-caption text-primary">
                  {trait.action}
                  <Icon name="arrow_forward" className="text-[16px]" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* The quiz answers all three at once, in terms of what you can
            see on your own head rather than what the categories are
            called. Worth saying here, where someone is being asked for
            three things they may not know. */}
        <Link
          to="/quiz"
          className="mt-md flex items-center gap-md rounded-xl bg-surface-container p-md transition-all active:scale-[0.98]"
        >
          <Icon name="science" className="shrink-0 text-primary" />
          <p className="flex-1 font-body-md text-caption text-on-surface-variant">
            Not sure about any of them? The hair quiz asks about what you can see, and fills
            in all three.
          </p>
          <Icon name="arrow_forward" className="shrink-0 text-outline" />
        </Link>
      </section>

      {/* B, C, D */}
      <section className="mb-2xl space-y-sm">
        {ROUTES.map((route) => (
          <Link
            key={route.to}
            to={route.to}
            className="flex items-center gap-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg transition-all active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
              <Icon name={route.icon} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-headline-md text-body-lg text-on-surface">
                <span className="text-on-surface-variant">{route.letter} · </span>
                {route.title}
              </h4>
              <p className="font-body-md text-caption text-on-surface-variant">{route.body}</p>
              {route.to === '/calendar' && due && (
                <p className="mt-xs font-label-md text-caption text-primary">
                  {(due.overdueDays ?? 0) > 0
                    ? `${due.schedule.type} is ${due.overdueDays} day${due.overdueDays === 1 ? '' : 's'} overdue`
                    : `${due.schedule.type} due ${relativeDay(due.dueKey!)}`}
                </p>
              )}
            </div>
            <Icon name="arrow_forward" className="shrink-0 text-outline" />
          </Link>
        ))}
      </section>
    </>
  )
}
