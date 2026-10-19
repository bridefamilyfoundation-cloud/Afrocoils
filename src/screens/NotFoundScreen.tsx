import { Link, useLocation } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'

/**
 * 404, keeping the app chrome.
 *
 * This used to be `<Navigate to="/" replace />` — a silent bounce to the
 * front page, which is the worst of both worlds: the user loses the
 * address they typed and never learns it was wrong, and a mistyped link
 * looks identical to a working one. Saying so costs a screen and returns
 * the choice to them.
 *
 * It sits inside `AppLayout` deliberately: the tab bar and the drawer
 * are the way out, and a dead end with no navigation is a worse dead
 * end. The links below are the four sections plus the two pages people
 * most often arrive looking for.
 */
const WAYS_OUT: { to: string; icon: IconName; label: string; body: string }[] = [
  {
    to: '/sos',
    icon: 'emergency_home',
    label: 'Hair SOS',
    body: 'Quick hairstyles, hair care, and what to do when something is wrong.',
  },
  {
    to: '/styles',
    icon: 'auto_awesome',
    label: 'Styles',
    body: 'The full library, with every angle and the method.',
  },
  {
    to: '/growth',
    icon: 'show_chart',
    label: 'Growth',
    body: 'Length checks, retention and the care calendar.',
  },
  {
    to: '/profile',
    icon: 'face_3',
    label: 'Profile',
    body: 'Your hair, your preferences and your product shelf.',
  },
]

export default function NotFoundScreen() {
  const { pathname } = useLocation()

  return (
    <>
      <section className="mb-2xl text-center">
        <Icon name="search" className="mb-md text-4xl text-outline" />
        <h2 className="mb-sm font-headline-lg text-headline-lg text-on-background">
          That page does not exist
        </h2>
        <p className="mx-auto max-w-md font-body-md text-body-md text-on-surface-variant">
          Nothing in the app answers to{' '}
          <code className="rounded bg-surface-container px-2 py-0.5 font-caption text-caption">
            {pathname}
          </code>
          . It may have been renamed, or the link may have been mistyped.
        </p>
      </section>

      <section className="mb-2xl space-y-sm">
        {WAYS_OUT.map((way) => (
          <Link
            key={way.to}
            to={way.to}
            className="flex items-center gap-md rounded-xl shadow-card bg-surface-container-lowest p-lg transition-all active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
              <Icon name={way.icon} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-headline-md text-body-lg text-on-surface">{way.label}</h3>
              <p className="font-body-md text-caption text-on-surface-variant">{way.body}</p>
            </div>
            <Icon name="arrow_forward" className="shrink-0 text-outline" />
          </Link>
        ))}
      </section>

      <div className="flex flex-wrap justify-center gap-md">
        <Link
          to="/"
          className="rounded-full bg-primary px-xl py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
        >
          Back to the front page
        </Link>
        <Link
          to="/faq"
          className="rounded-full border border-outline-variant px-xl py-3 font-label-md text-label-md text-on-surface transition-all active:scale-95"
        >
          Read the FAQ
        </Link>
      </div>
    </>
  )
}
