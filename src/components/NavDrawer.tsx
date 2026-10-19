import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import BrandLockup from './BrandMark'
import Icon, { type IconName } from './Icon'
import { useBackDismiss } from '../lib/back-button'

/**
 * The drawer is the app's table of contents, so it lists sections and
 * nothing else.
 *
 * It used to carry ten primary links plus every care guide, which made it
 * a second, longer copy of the app rather than a map of it — and left the
 * user to work out for themselves that "Porosity test" and "Community
 * tips" were parts of hair care rather than peers of it. Everything that
 * was a leaf now lives inside the section it belongs to: guides, the
 * porosity test and the product shelf under SOS, the calendar under
 * Growth, the hair quiz under Profile, community tips under About.
 *
 * What is left is the six sections. There is no Home entry: Hair SOS is
 * the front page as well as the section, so a separate Home would point
 * at the same screen. Two of the six, Hair Care and Locs World, have no
 * tab either: the bottom bar is four.
 */
const PRIMARY: {
  to: string
  icon: IconName
  label: string
  /** Other addresses of the same screen, which must light this entry too. */
  also?: string[]
}[] = [
  // No separate Home entry: Hair SOS *is* the front page now, so two
  // entries would point at one screen.
  { to: '/sos', icon: 'emergency_home', label: 'Hair SOS', also: ['/', '/home'] },
  { to: '/styles', icon: 'auto_awesome', label: 'Hair Styles' },
  // Hair Care and Locs World are the two entries here that are not tabs.
  // They earn the place because they are sections rather than leaves, and
  // the bottom bar is four. The tab labels stay short for the same
  // reason — "My Hair Profile" does not fit a quarter of a phone.
  { to: '/care', icon: 'spa', label: 'Hair Care' },
  { to: '/growth', icon: 'show_chart', label: 'Hair Growth' },
  { to: '/locs', icon: 'waves', label: 'Locs World' },
  { to: '/profile', icon: 'face_3', label: 'My Hair Profile' },
]

const SECONDARY = [
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/docs', label: 'Documentation' },
  { to: '/legal/privacy', label: 'Privacy Policy' },
  { to: '/legal/terms', label: 'Terms of Service' },
  { to: '/legal/contact', label: 'Contact Us' },
]

export default function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  const closeButton = useRef<HTMLButtonElement>(null)
  const restoreFocusTo = useRef<Element | null>(null)

  // On Android the back button is the dismiss gesture, and it is the one
  // this drawer is actually closed with. Escape below is the browser's
  // equivalent and costs nothing to keep.
  useBackDismiss(open, onClose)

  // Close on Escape, and stop the page behind from scrolling while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  /**
   * Move focus in on open, and put it back on close.
   *
   * Without this a keyboard or switch user opens the menu and their
   * focus stays on the page behind it — the panel announces itself and
   * then cannot be reached, while the thing that opened it has moved out
   * from under them.
   */
  useEffect(() => {
    if (open) {
      restoreFocusTo.current = document.activeElement
      closeButton.current?.focus()
      return
    }
    const previous = restoreFocusTo.current
    restoreFocusTo.current = null
    if (previous instanceof HTMLElement) previous.focus()
  }, [open])

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-inverse-surface/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* `inert` rather than `aria-hidden` when closed.
          `aria-hidden` left all eleven links in the tab order while
          telling a screen reader they were not there — a keyboard user
          tabbed straight into content sitting off the side of the
          screen. `inert` removes them from the tab order and implies the
          hiding, which is what was meant both times. */}
      <aside
        inert={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`app-chrome fixed inset-y-0 left-0 z-[61] flex w-80 max-w-[85vw] flex-col bg-surface shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-lg pb-md pt-safe">
          <BrandLockup size="sm" />
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90"
          >
            <Icon name="arrow_back" className="text-primary" />
          </button>
        </div>

        {/* The primary list sits at the top and the About group is pushed
            to the base by the flex-1 on the nav, so the two never read as
            one continuous list of equals. */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-md pb-lg">
          <div className="flex-1">
            {PRIMARY.map((item) => {
              // Computed, not left to NavLink: it only sets aria-current on
              // its own match, so Hair SOS would look selected on `/` while
              // announcing nothing.
              const selected =
                item.also?.includes(pathname) ||
                pathname === item.to ||
                pathname.startsWith(item.to + '/')
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  aria-current={selected ? 'page' : undefined}
                  className={`mb-xs flex items-center gap-md rounded-full px-lg py-3 font-label-md text-label-md transition-colors ${
                    selected
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'text-on-surface-variant'
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="mt-lg border-t border-outline-variant/30 pt-md">
            {SECONDARY.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="mb-xs block rounded-full px-lg py-2 font-body-md text-body-md text-on-surface-variant"
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}
