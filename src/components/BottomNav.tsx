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

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav data-tour="tab-bar" className="app-chrome fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-xl bg-surface px-4 pt-2 pb-safe shadow-[0_-4px_12px_0_rgba(144,76,49,0.08)]">
      {TABS.map(({ to, icon, label, also }) => {
        const selected = isSelected(pathname, to, also)
        return (
          <Link
            key={to}
            to={to}
            aria-current={selected ? 'page' : undefined}
            className={[
              'flex flex-col items-center justify-center rounded-full px-4 py-1.5 duration-200 active:scale-90',
              selected
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant transition-all hover:opacity-80',
            ].join(' ')}
          >
            <Icon name={icon} filled={selected} />
            <span className="font-label-md text-caption">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
