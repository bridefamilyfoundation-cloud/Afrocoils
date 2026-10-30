import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'
import { useOpenParam, useScrollToOpened } from '../lib/deep-link'
import { startTour } from '../lib/tour'
import { CLIMATES, OCCASIONS, PREFERENCE_LABELS, STYLE_CATEGORIES, TIME_BANDS } from '../lib/types'

/**
 * The documentation, at `/docs`: the whole app on one page.
 *
 * The FAQ answers the five questions people ask; this is the manual
 * they would read before asking them. One section per part of the app,
 * in drawer order, then the cross-cutting parts — how ranking works,
 * where data goes, updates.
 *
 * Like the FAQ, every sentence here is a claim about the code, and
 * several repeat claims made elsewhere: the ranking criteria match the
 * recommendations screen and `rankStyles`, the data section matches the
 * privacy policy, and the contribution section matches what
 * `/styles/submit` says about its queue. Lists that the code already
 * holds (time bands, categories, occasions, preferences, climates) are
 * read from `types.ts` rather than retyped, so they cannot drift.
 *
 * The contents list scrolls rather than links: routing is hash-based, so
 * an in-page `#anchor` would be read as a route.
 */

const list = (items: readonly string[]) => items.join(', ')

const [ENFORCED, RANKED] = (() => {
  const labels = Object.values(PREFERENCE_LABELS)
  return [labels.slice(0, 3), labels.slice(3)]
})()

const SECTIONS: {
  id: string
  icon: IconName
  title: string
  body: React.ReactNode
  links?: { to: string; label: string }[]
}[] = [
  {
    id: 'start',
    icon: 'explore',
    title: 'Getting started',
    body: (
      <>
        <p>
          The app opens on Hair SOS. Get Started scrolls down to the two doors; nothing else
          is needed to use it.
        </p>
        <p>
          The one answer that changes most of the app is whether you have{' '}
          <strong>loose natural hair or locs</strong>. Until it knows, every list is
          generic. Take the hair quiz, which asks about what you can see on your own head,
          or set it directly on My Hair Profile. Everything else on the profile sharpens
          results but is optional.
        </p>
      </>
    ),
    links: [
      { to: '/quiz', label: 'Take the hair quiz' },
      { to: '/profile', label: 'My Hair Profile' },
    ],
  },
  {
    id: 'navigation',
    icon: 'menu',
    title: 'Finding your way',
    body: (
      <>
        <p>
          The app is six sections: Hair SOS, Hair Styles, Hair Care, Hair Growth, Locs World
          and My Hair Profile.
        </p>
        <ul>
          <li>
            <strong>The tab bar</strong> along the bottom holds four of them, SOS, Styles,
            Growth and Profile, on every screen. The one you are in is the orange pill with
            its name; the other three are icons.
          </li>
          <li>
            <strong>The menu</strong> (top left) lists all six, including Hair Care and Locs
            World, which have no tab. About, FAQ, this page, the privacy policy, the terms and
            contact details are at its foot.
          </li>
          <li>
            <strong>The logo</strong> in the middle of the top bar returns to Hair SOS, and{' '}
            <strong>your photo</strong> on the right opens your profile. The{' '}
            <strong>Ask</strong> button floats at the bottom right, above the tabs.
          </li>
          <li>
            Screens inside a section show a small <strong>“Part of …”</strong> label at the top
            that takes you back to it.
          </li>
          <li>
            On Android, <strong>back</strong> closes whatever is open first (the menu, a sheet,
            the tour) and only then goes back a screen.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'ask',
    icon: 'forum',
    title: 'Ask',
    body: (
      <>
        <p>
          The Ask button at the bottom right, on every screen. Type a question the way you would
          say it (“my ends keep breaking”, “a quick style for work”, “how do I set a reminder?”)
          and it opens a conversation: ask a follow-up and the answer appears beneath the last.
        </p>
        <ul>
          <li>
            <strong>Answers are written, not generated.</strong> Most common questions have an
            answer written for them: a direct reply, what to do in order, and a button to the
            screen where you do it. Anything else is answered from a guide, the Quick Hair Check,
            Locs World, the style library, the product shelf or this page, word for word. Any
            caution is shown in full.
          </li>
          <li>
            <strong>It fits the answer to your profile.</strong> Some answers carry lines
            written for one kind of hair (low porosity, starter locs, a dry climate, heatless
            only), shown under “For your hair” when your profile matches, with what on your
            profile chose them. If you have set a name, it uses it.
          </li>
          <li>
            <strong>It follows your hair type</strong>, the same as every list in the app.
            Loose-hair technique is never shown to a loc wearer; if that is what matched best,
            Ask says it left it out. Ask about locs by name and it answers for locs.
          </li>
          <li>
            <strong>It understands everyday words</strong> (“dandruff”, “dreads”, “my hair
            keeps coming out”) and small typos, and says which spelling it used.
          </li>
          <li>
            <strong>Every reply ends somewhere you can act</strong>: a button to the screen
            where you fix it, and a link to what the community says. If a question is about
            hair but nothing is written for it, Ask says so rather than guessing and points you
            to the Quick Hair Check; if it is not about hair, Ask says so calmly and offers a
            few things to ask. Questions that sound medical get the same advice as below: see a
            dermatologist or a trichologist.
          </li>
        </ul>
        <p>
          It answers on your phone and works with no signal. The conversation is forgotten
          when the app closes. Each question is shared anonymously with the team, who read
          what Ask could not answer and write those answers next — the line under the box
          says when sharing is on, and About switches it off.
        </p>
      </>
    ),
    links: [{ to: '/ask', label: 'Ask a question' }],
  },
  {
    id: 'sos',
    icon: 'emergency_home',
    title: 'Hair SOS',
    body: (
      <>
        <p>
          The front page, for when your hair needs sorting now. It asks “What’s your
          emergency?” and offers two ways in.
        </p>
        <ul>
          <li>
            <strong>Quick Hairstyle</strong>: pick how long you have ({list(TIME_BANDS.map((b) => b.label))})
            and see the styles that fit, ranked against your profile, shortest first.
          </li>
          <li>
            <strong>Hair Care</strong>: opens the Hair Care section, described below.
          </li>
        </ul>
        <p>
          If you wear locs, a Locs World card appears under the doors. While your profile is
          incomplete, a card at the foot of the page offers the hair quiz.
        </p>
      </>
    ),
    links: [{ to: '/sos/quick', label: 'Quick Hairstyle' }],
  },
  {
    id: 'styles',
    icon: 'auto_awesome',
    title: 'Hair Styles',
    body: (
      <>
        <p>
          The full style library. Browse it by category ({list(STYLE_CATEGORIES)}) and by
          occasion ({list(OCCASIONS)}).
        </p>
        <ul>
          <li>
            <strong>Recommended for your hair</strong>, at the top, is the same library ranked
            against your profile. It lists the criteria it used (see{' '}
            <em>How recommendations work</em> below).
          </li>
          <li>
            <strong>A style’s page</strong> has its pictures (front, back and side), the time it
            takes, what you will need and the steps. Bookmark it to keep it in the Saved row at
            the top of the library.
          </li>
          <li>
            <strong>Share a style</strong> adds one of your own (see <em>Contributing a
            style</em>).
          </li>
        </ul>
        <p>
          Every entry was contributed by someone who wears it. So far they are all for loose
          hair, so loc wearers will find the shelf empty. The loc lookbook is in Locs World.
          The style pictures are illustrations made with an image generator before release;
          the words are not generated.
        </p>
      </>
    ),
    links: [
      { to: '/styles', label: 'Browse styles' },
      { to: '/styles/recommended', label: 'Recommended for you' },
    ],
  },
  {
    id: 'care',
    icon: 'spa',
    title: 'Hair Care',
    body: (
      <>
        <p>What your hair is, what it needs on a schedule, and what to put on it.</p>
        <ul>
          <li>
            <strong>Know your hair</strong>: porosity, density, coil pattern and texture. Each
            card shows what your profile already holds. Porosity has its own short test; the
            others are set on your profile.
          </li>
          <li>
            <strong>Hair routine</strong> is the calendar. Log wash days, deep conditioning,
            treatments, retwists, trims and installs, set how often each should happen, and the
            app works out what is due next. Reminders are optional and per routine.
          </li>
          <li>
            <strong>Product recommendations</strong> is a short shelf filtered to your porosity
            and preferences. It is the only place in the app that names brands, and it has no
            product photos.
          </li>
          <li>
            <strong>Hairstyle recommendations</strong> opens the ranked style list.
          </li>
          <li>
            <strong>Something is wrong</strong> starts from the symptom (dryness, an itchy
            scalp, buildup, breakage) with the Quick Hair Check and the care guides.
          </li>
        </ul>
        <p>
          The Quick Hair Check does not diagnose. Hair loss, bald patches, a receding
          hairline and scalp bumps point you to a dermatologist or trichologist instead of a
          product.
        </p>
      </>
    ),
    links: [
      { to: '/care', label: 'Hair Care' },
      { to: '/porosity', label: 'Porosity test' },
      { to: '/calendar', label: 'Hair routine' },
      { to: '/products', label: 'Products' },
      { to: '/sos/problem', label: 'Something is wrong' },
    ],
  },
  {
    id: 'growth',
    icon: 'show_chart',
    title: 'Hair Growth',
    body: (
      <>
        <p>
          Hair grows at a steady rate. What differs from person to person is how much of it
          survives, so this section measures retention.
        </p>
        <ul>
          <li>
            <strong>What is due</strong>: the next things your routine says are coming up.
          </li>
          <li>
            <strong>Length checks</strong>: measure stretched, from scalp to ends, in inches or
            centimetres, on the same section and the same day of your wash week each time. The
            chart and milestones build from there. Your latest check also tells the style
            rankings roughly how long your hair is.
          </li>
          <li>
            <strong>Retention</strong>: a trend line fitted through every check, compared with
            the 0.3&Prime; a month afro-textured hair grows on average (Loussouarn, 2001). A tape
            on coily hair is only good to about a quarter-inch, so it waits until your checks
            reach past that &mdash; about four months of monthly checks &mdash; and then shows a
            range as well as a figure. Log a trim on the check after it and it is added back, so
            a trim never counts as breakage. Starter and budding locs shrink as they mature, so
            for them retention waits for the teen stage.
          </li>
          <li>
            <strong>My styles</strong>: styles you have actually worn, with your own photos. Any
            of them can be offered to the library.
          </li>
        </ul>
      </>
    ),
    links: [{ to: '/growth', label: 'Hair Growth' }],
  },
  {
    id: 'locs',
    icon: 'waves',
    title: 'Locs World',
    body: (
      <>
        <p>
          Understanding, starting, maintaining and caring for locs, kept apart from general
          care on purpose: much of the technique that is right for loose hair damages a loc.
        </p>
        <ul>
          <li>
            <strong>Loose or Loc’d?</strong> opens the page. Choosing one sets your hair type,
            the same setting as on your profile. Choosing loose natural hair takes you to Hair
            Care.
          </li>
          <li>
            <strong>The Loc Lookbook</strong> shows each loc look front, back and side, from
            starter locs to updos. Tap Front, Back or Side under a picture, or swipe it. If you
            have locs, your stage is lit on the strand at the top of Locs World. A style with no
            pictures yet links to the contribute form, already filled in with its name.
          </li>
          <li>
            <strong>Chapters</strong> cover the whole loc journey, from deciding to loc to
            colouring and repair. Signs, causes and what to do are listed together, and the
            things to avoid are struck through so they never read as instructions.
          </li>
          <li>
            On your profile, set your loc type and the date you started, and the app works out
            your loc stage and your retwist routine.
          </li>
        </ul>
      </>
    ),
    links: [
      { to: '/locs', label: 'Locs World' },
      { to: '/locs/styles', label: 'Loc styles' },
    ],
  },
  {
    id: 'profile',
    icon: 'face_3',
    title: 'My Hair Profile',
    body: (
      <>
        <p>Two kinds of thing live here, and none of it leaves your phone.</p>
        <ul>
          <li>
            <strong>About you</strong>: a name, a photo and your climate (
            {list(CLIMATES)}).
          </li>
          <li>
            <strong>About your hair</strong>: hair type, then coil pattern, porosity, density,
            texture and scalp, or loc type and start date if you wear locs. The meter shows how
            much is filled in. The hair quiz fills in the same fields in plainer terms.
          </li>
          <li>
            <strong>Care preferences</strong>: {list(ENFORCED)} are <em>enforced</em>, so
            anything that breaks one is removed before you see it. {list(RANKED)} only change
            the order.
          </li>
        </ul>
      </>
    ),
    links: [
      { to: '/profile', label: 'My Hair Profile' },
      { to: '/quiz', label: 'Hair quiz' },
    ],
  },
  {
    id: 'ranking',
    icon: 'linear_scale',
    title: 'How recommendations work',
    body: (
      <>
        <p>
          Nothing is generated. The app filters and ranks the content it already has, on
          your phone, using your profile:
        </p>
        <ul>
          <li>
            <strong>Hair type</strong> is a hard filter. Loose-hair styles are never shown to a
            loc wearer, and a style counts as loose-only unless it says otherwise.
          </li>
          <li>
            <strong>Enforced care preferences</strong> remove clashing styles outright. They are
            never shown greyed out or sunk to the bottom.
          </li>
          <li>
            <strong>Hair length</strong>, taken from your latest length check, only changes the
            order. Most styles still work on shorter hair.
          </li>
          <li>
            <strong>Porosity, density and coil pattern</strong> do not rank styles yet, because
            no style in the library has been tagged with them.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'contribute',
    icon: 'add_photo_alternate',
    title: 'Contributing a style',
    body: (
      <>
        <p>
          Share a style from Hair Styles, from one of your own under My styles, or from a loc
          style in the lookbook that has no pictures yet. Give it a name, a short description,
          your photos and the credit you want, say which hair it is for if the app does not
          already know, and confirm that the photos are yours to give. A reviewer writes up
          anything else the library needs.
        </p>
        <p>
          There is no community server yet. Your submission is saved on this phone, listed on
          the Share a style screen, and waits there until there is somewhere to send it.
          Nothing is uploaded in the background, and you can withdraw it until it is sent.
          Once sent, a person reads it before anything is published.
        </p>
      </>
    ),
    links: [{ to: '/styles/submit', label: 'Share a style' }],
  },
  {
    id: 'data',
    icon: 'shield',
    title: 'Your data',
    body: (
      <>
        <p>
          Your profile, length checks, calendar, photos and saved styles are stored on this
          phone and nowhere else. There is no account, no sign-in and no tracking.
          Uninstalling the app deletes everything on the phone.
        </p>
        <p>
          Three things leave the phone. The questions you type into Ask, sent anonymously (the
          words and what Ask answered, nothing from your profile, no identifier) so the team
          can write the answers people are missing, kept for up to twelve months; switch this
          off under About. A style you choose to contribute, when it is sent. And the update
          check described below, which carries nothing about you.
        </p>
        <p>
          Everything you read ships inside the app, so it all works with no signal, including
          in aeroplane mode. Ask answers on the phone too; with no signal, the question simply
          is not shared.
        </p>
      </>
    ),
    links: [{ to: '/legal/privacy', label: 'Privacy policy' }],
  },
  {
    id: 'updates',
    icon: 'system_update',
    title: 'Updates',
    body: (
      <>
        <p>
          When the app opens, and when you come back to it (at most every six hours), it asks
          our update server whether anything newer is out. The request carries no profile
          data, no identifier and nothing else about you.
        </p>
        <p>
          Most updates install in place. A sheet says &ldquo;An update is ready&rdquo;; tap
          Update now and the app downloads it, checks it, and restarts into it. There is
          nothing to reinstall, and your profile, history and photos stay where they are.
        </p>
        <p>
          A change to the app itself comes as a new version instead. The sheet offers the
          download, Android asks you to confirm, and it installs over this one with your
          profile intact. Nothing installs on its own either way, and you can switch the
          check off on About, which also lists any update you put off.
        </p>
      </>
    ),
    links: [{ to: '/about', label: 'About' }],
  },
  {
    id: 'limits',
    icon: 'info',
    title: 'What it is not',
    body: (
      <p>
        Everything here is general guidance about hair. The app cannot see your hair and does
        not know your medical history. Sudden shedding, bald patches, persistent scalp pain or
        anything that is getting worse is a question for a dermatologist or a trichologist.
      </p>
    ),
    links: [
      { to: '/faq', label: 'FAQ' },
      { to: '/legal/contact', label: 'Contact us' },
    ],
  },
]

export default function DocsScreen() {
  // `?open=<section id>` lands on one section — how Ask points here.
  const requested = useOpenParam()
  useScrollToOpened(
    requested && SECTIONS.some((s) => s.id === requested) ? `docs-${requested}` : null,
  )

  return (
    <>
      <ScreenHeader
        title="Documentation"
        subtitle="How AfroCoils works, section by section."
      />

      <button
        type="button"
        onClick={startTour}
        className="mb-xl flex w-full items-center gap-md rounded-2xl bg-primary-container p-lg text-left text-on-primary-container transition-all active:scale-[0.98]"
      >
        <Icon name="explore" className="shrink-0 text-3xl" />
        <span className="min-w-0 flex-1">
          <span className="block font-headline-md text-body-lg">Take the tour</span>
          <span className="block font-body-md text-caption opacity-90">
            A one-minute walk through the six sections
          </span>
        </span>
        <Icon name="arrow_forward" className="shrink-0 opacity-80" />
      </button>

      <nav aria-label="Contents" className="mb-2xl rounded-2xl bg-surface-container p-lg">
        <h2 className="mb-sm font-headline-md text-body-lg font-bold text-on-surface">
          Contents
        </h2>
        <ol className="space-y-xs">
          {SECTIONS.map((section, i) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(`docs-${section.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="flex w-full items-center gap-sm py-1 text-left font-body-md text-body-md text-on-surface"
              >
                <span className="w-6 shrink-0 font-label-md text-caption text-on-surface-variant">
                  {i + 1}
                </span>
                {section.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-2xl">
        {SECTIONS.map((section) => (
          <section key={section.id} id={`docs-${section.id}`} className="scroll-mt-24">
            <div className="mb-sm flex items-center gap-sm">
              <Icon name={section.icon} className="text-primary" />
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {section.title}
              </h2>
            </div>
            {/* Prose styling in one place rather than a class on every
                paragraph and list item above. */}
            <div className="space-y-sm font-body-md text-body-md text-on-surface-variant [&_li]:pl-xs [&_strong]:text-on-surface [&_ul]:list-disc [&_ul]:space-y-xs [&_ul]:pl-lg">
              {section.body}
            </div>
            {section.links && (
              <div className="mt-md flex flex-wrap gap-sm">
                {section.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="inline-flex items-center gap-xs rounded-full border border-outline-variant px-md py-2 font-label-md text-caption text-on-surface transition-all active:scale-95"
                  >
                    {link.label}
                    <Icon name="chevron_right" className="text-[16px]" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  )
}
