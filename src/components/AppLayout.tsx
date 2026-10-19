import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import AppFooter from './AppFooter'
import BottomNav from './BottomNav'
import NavDrawer from './NavDrawer'
import TopAppBar from './TopAppBar'
import { useDocumentTitle } from '../lib/page-title'

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // A distinct title per route: the browser tab, the Android recents
  // card and a screen reader's navigation announcement all read it.
  useDocumentTitle(pathname)

  /**
   * Scroll position across navigation.
   *
   * Going *forward* starts at the top: otherwise a new screen opens
   * halfway down wherever the previous one was left. Going *back*
   * restores where you were, because it is a return to a page you have
   * already read, not an arrival at a new one.
   *
   * Resetting on both was one line and cost the browse flow: opening the
   * fourteenth style in the library and coming back put you at the top
   * of the library, which on a long shelf is the difference between
   * comparing two styles and giving up. `useNavigationType` is what
   * separates the two — POP is the back button and the back gesture.
   */
  const navigationType = useNavigationType()
  const offsets = useRef(new Map<string, number>())

  useEffect(() => {
    const saved = offsets.current.get(pathname)
    if (navigationType === 'POP' && saved !== undefined) {
      // After the restored screen has laid out, or there is nothing to
      // scroll to yet and the browser clamps this to zero.
      requestAnimationFrame(() => window.scrollTo(0, saved))
    } else {
      window.scrollTo(0, 0)
    }

    const remember = () => offsets.current.set(pathname, window.scrollY)
    window.addEventListener('scroll', remember, { passive: true })
    return () => {
      remember()
      window.removeEventListener('scroll', remember)
    }
  }, [pathname, navigationType])

  return (
    <div className="relative isolate min-h-full text-on-background">
      <div aria-hidden className="page-wash fixed inset-0 -z-10" />
      <TopAppBar onOpenMenu={() => setMenuOpen(true)} />
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Clears the fixed app bar, whose real height is 64px plus the
          status-bar inset — a flat pt-24 was right only on a device with
          no cutout, and slid the top of every screen under the bar on
          the ones that have one. */}
      <main className="mx-auto max-w-5xl px-container-padding pt-[calc(6rem+var(--safe-top))]">
        <Outlet />
      </main>

      <AppFooter />

      {/* Spacer so the footer clears the fixed bottom nav. */}
      <div className="h-32" />

      <BottomNav />
    </div>
  )
}
