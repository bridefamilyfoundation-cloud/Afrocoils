import { Link, useLocation } from 'react-router-dom'
import Icon, { type IconName } from './Icon'

/**
 * The four sections, and only the four.
 *
 * Everything else in the app now lives inside one of them — the calendar
 * under Growth, the product shelf and the care guides under SOS, the
 * hair quiz under Profile — so the tab bar names the whole app rather
 * than a selection from it. Five tabs was the old ceiling; four is the
 * structure.
 *
 * SOS answers to `/`, `/home` and `/sos` — the front page and the
 * section are one screen — which is what `also` below is for: without it
 * nothing is selected on the page every launch lands on. It is the one
 * tab with children (`/sos/quick`, `/sos/problem`), and `isSelected`
 * below matches by prefix, so it stays lit while you are inside one.
 */
const TABS: {
  to: string
  icon: IconName
  label: string
  /** Other addresses of the same screen, which must light this tab too. */
  also?: string[]
}[] = [
  // `also` covers the other two addresses of the same screen. Without it
  // the tab bar shows nothing selected on the page every launch lands on.
  { to: '/sos', icon: 'emergency_home', label: 'SOS', also: ['/', '/home'] },
  { to: '/styles', icon: 'auto_awesome', label: 'Styles' },
  { to: '/growth', icon: 'show_chart', label: 'Growth' },
  { to: '/profile', icon: 'face_3', label: 'Profile' },
]

/**
 * Selected state, computed rather than left to `NavLink`.
 *
 * `NavLink` only sets `aria-current` when its *own* path matches, so the
 * SOS tab would look selected on `/` and `/home` while announcing
 * nothing to a screen reader — visual and assistive state disagreeing is
 * worse than either being wrong on its own. Prefix matching is kept
 * (`/sos` stays lit inside `/sos/quick`), which is what omitting `end`
 * used to buy.
 */
function isSelected(pathname: string, to: string, also?: string[]): boolean {
  if (also?.includes(pathname)) return true
  return pathname === to || pathname.startsWith(to + '/')
}

/**
 * A floating pill rather than a bar across the foot, after the reference
 * mockup: espresso, inset from the edges, with the selected tab drawn as
 * an orange pill that carries its label and the other three as icons.
 *
 * The labels the others drop are still there for a screen reader, as
 * `aria-label` — an icon-only tab that announced nothing would be a tab
 * nobody using TalkBack could find. White on the orange is 3.6:1, the
 * brand's own pairing, which is why the one label shown is set bold.
 */
export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      data-tour="tab-bar"
      className="app-chrome fixed inset-x-0 bottom-0 z-50 flex justify-center px-gutter pb-[calc(0.75rem+var(--safe-bottom))]"
    >
      <div className="flex w-full max-w-md items-center justify-between gap-xs rounded-full bg-inverse-surface p-1.5 shadow-float">
        {TABS.map(({ to, icon, label, also }) => {
          const selected = isSelected(pathname, to, also)
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={selected ? 'page' : undefined}
              className={[
                'flex h-12 items-center justify-center gap-sm rounded-full transition-all duration-200 active:scale-90',
                selected
                  ? 'bg-secondary px-lg text-on-secondary'
                  : 'w-12 text-inverse-on-surface/75 hover:text-inverse-on-surface',
              ].join(' ')}
            >
              <Icon name={icon} filled={selected} className="text-[22px]" />
              {selected && <span className="font-label-md text-label-md font-bold">{label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
