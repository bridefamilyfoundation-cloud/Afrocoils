import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import AppFooter from './AppFooter'
import AskLauncher from './AskLauncher'
import BottomNav from './BottomNav'
import MembershipNotice from './MembershipNotice'
import NavDrawer from './NavDrawer'
import ScreenFallback from './ScreenFallback'
import TopAppBar from './TopAppBar'
import { hasAccess } from '../lib/membership'
import { useDocumentTitle } from '../lib/page-title'
import { useHairProfile } from '../lib/profile-store'

/**
 * What a phone without a paid membership can open: the front page (at
 * its three addresses), the join screen, and the legal pages the join
 * screen links to — someone is asked to agree to the terms and the
 * privacy policy before paying, so both have to be readable first.
 * Every other address goes to the join screen.
 */
const OPEN_WHEN_LOCKED = new Set(['/', '/home', '/sos', '/join'])
const lockedCanOpen = (pathname: string) => OPEN_WHEN_LOCKED.has(pathname) || pathname.startsWith('/legal/')

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const { profile, ready } = useHairProfile()
  const open = hasAccess(profile.membership)

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

  /*
   * Which screen a scroll event belongs to.
   *
   * The position used to be read once more as the old screen was torn
   * down. By then the new screen was already in the document, and if it
   * was shorter the browser had clamped the scroll to its height: the
   * fourteenth row of the library was remembered as wherever a style's
   * page happened to end, and back landed there. Now positions are only
   * ever recorded from scroll events, and this ref is moved to the new
   * path in a layout effect, in the same commit that swaps the screens
   * and before the browser can report the clamp, so that event is filed
   * under the screen that caused it.
   */
  const scrolling = useRef(pathname)
  useLayoutEffect(() => {
    scrolling.current = pathname
  }, [pathname])

  useEffect(() => {
    const remember = () => offsets.current.set(scrolling.current, window.scrollY)
    window.addEventListener('scroll', remember, { passive: true })
    return () => window.removeEventListener('scroll', remember)
  }, [])

  // Read through a ref: the effect below is about arriving at a screen,
  // and must not run again when a filter on that screen rewrites its own
  // query string (a REPLACE on the same path), which would throw the
  // page back to the top under the chip that was just tapped.
  const arrivedBy = useRef(navigationType)
  arrivedBy.current = navigationType

  useEffect(() => {
    const saved = offsets.current.get(pathname)
    if (arrivedBy.current !== 'POP' || saved === undefined) {
      window.scrollTo(0, 0)
      return
    }
    // After the restored screen has laid out, or there is nothing to
    // scroll to yet and the browser clamps this to zero. A screen that
    // is still filling in gets a few frames to grow tall enough.
    let frame = 0
    let tries = 0
    const restore = () => {
      window.scrollTo(0, saved)
      if (Math.abs(window.scrollY - saved) > 2 && ++tries < 20) frame = requestAnimationFrame(restore)
    }
    frame = requestAnimationFrame(restore)
    return () => cancelAnimationFrame(frame)
  }, [pathname])

  // Nothing is decided until the profile has been read: an empty profile
  // is signed out, and a member must not be bounced to the join screen
  // for the moment it takes to read their own phone.
  if (!ready) return <ScreenFallback />
  if (!open && !lockedCanOpen(pathname)) return <Navigate to="/join" replace />

  return (
    <div className="relative isolate min-h-full text-on-background">
      <div aria-hidden className="page-wash fixed inset-0 -z-10" />
      {/* Locked, the bar keeps the name and loses the way in: the menu,
          the tab bar and Ask all lead to sections a non-member cannot
          open. */}
      <TopAppBar onOpenMenu={open ? () => setMenuOpen(true) : undefined} />
      {open && <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />}

      {/* Clears the fixed app bar, whose real height is 64px plus the
          status-bar inset — a flat pt-24 was right only on a device with
          no cutout, and slid the top of every screen under the bar on
          the ones that have one. */}
      <main className="mx-auto max-w-5xl px-container-padding pt-[calc(6rem+var(--safe-top))]">
        {open && <MembershipNotice />}
        <Outlet />
      </main>

      <AppFooter locked={!open} />

      {/* Spacer so the footer clears the fixed bottom nav. */}
      <div className={open ? 'h-32' : 'h-8'} />

      {open && <BottomNav />}

      {/* Ask, from every screen: bottom right, above the tab bar. */}
      {open && <AskLauncher />}
    </div>
  )
}
