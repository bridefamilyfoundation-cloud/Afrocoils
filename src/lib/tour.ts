import { useSyncExternalStore } from 'react'

/**
 * The welcome tour: what it says, and whether it is running.
 *
 * The steps are content like everything else in the app — written by a
 * person, shipped in the bundle — and they describe the structure in
 * CLAUDE.md rather than inventing one: six sections, four tabs, Hair SOS
 * as the front page. If a section moves, its step moves with it.
 *
 * The running state is a module store rather than component state, so
 * the menu and the documentation page can start the tour without a
 * provider, and a lazy screen suspending mid-tour cannot reset it.
 */

export interface TourStep {
  /** Where the step happens. The tour navigates there first. */
  path: string
  /**
   * The `data-tour` value of the element to spotlight. Absent, or not
   * found on the page, and the card sits centred instead — a step is
   * never skipped for want of a highlight.
   */
  target?: string
  title: string
  body: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    path: '/sos',
    title: 'Welcome to AfroCoils',
    body: 'A minute to show you where everything is. You can skip it, and replay it any time from Documentation in the menu.',
  },
  {
    path: '/sos',
    target: 'sos-doors',
    title: 'Hair SOS is the front page',
    body: 'For when your hair needs sorting now. Quick Hairstyle filters styles by the time you have; Hair Care is everything about knowing and looking after your hair.',
  },
  {
    path: '/sos',
    target: 'tab-bar',
    title: 'Four tabs',
    body: 'SOS, Styles, Growth and Profile are always one tap away along the bottom, on every screen. The orange pill is where you are.',
  },
  {
    path: '/sos',
    target: 'ask-button',
    title: 'Ask',
    body: 'The Ask button, bottom right on every screen. Type a question the way you would say it, like "my ends keep breaking", and get the answer AfroCoils has written for it, fitted to your profile, with a button to where you fix it. It works with no signal.',
  },
  {
    path: '/styles',
    target: 'styles-recommended',
    title: 'Hair Styles',
    body: 'The full library, by category and occasion. Recommended for your hair ranks it against your profile and tells you which criteria it used.',
  },
  {
    path: '/care',
    target: 'care-heading',
    title: 'Hair Care',
    body: 'Your porosity, density, coil pattern and texture, a routine with reminders, a product shelf, and "Something is wrong" for when it is.',
  },
  {
    path: '/growth',
    target: 'growth-heading',
    title: 'Hair Growth',
    body: 'Log a length check every month and see what you are keeping, not just what you grow. Your own worn styles and photos live here too.',
  },
  {
    path: '/locs',
    target: 'locs-heading',
    title: 'Locs World',
    body: 'Starting, maintaining and caring for locs, plus a lookbook of loc styles. It is kept apart from loose-hair care on purpose: much loose-hair technique damages locs.',
  },
  {
    path: '/profile',
    target: 'profile-heading',
    title: 'My Hair Profile',
    body: 'Tell the app whether you have loose hair or locs and the rest follows. The hair quiz fills this in from what you can see on your own head.',
  },
  {
    path: '/sos',
    target: 'menu-button',
    title: 'The menu',
    body: 'All six sections, including Hair Care and Locs World, which have no tab. About, FAQ, Documentation and the privacy policy are at the foot.',
  },
  {
    path: '/sos',
    title: 'That is the app',
    body: 'Everything you read here is on this phone and works with no signal. The documentation explains each section in full.',
  },
]

/** The step showing, or null when the tour is not running. */
let current: number | null = null
const listeners = new Set<() => void>()

function set(next: number | null) {
  current = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTourStep(): number | null {
  return useSyncExternalStore(subscribe, () => current)
}

export function startTour(): void {
  set(0)
}

export function goToStep(index: number): void {
  set(index >= 0 && index < TOUR_STEPS.length ? index : null)
}

export function endTour(): void {
  set(null)
}
