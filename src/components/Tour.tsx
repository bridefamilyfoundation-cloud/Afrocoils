import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { useBackDismiss } from '../lib/back-button'
import { useHairProfile } from '../lib/profile-store'
import { TOUR_STEPS, endTour, goToStep, startTour, useTourStep } from '../lib/tour'

/**
 * The welcome tour, drawn over whatever screen it is showing.
 *
 * Mounted once inside the router but outside the `Suspense` boundary, so
 * a lazy screen loading between steps does not unmount it.
 *
 * It offers itself once, on the front page, the first time the app opens
 * with a profile that has never seen it — and the first card is a
 * question, not a slideshow: someone who opened the app mid-problem is
 * one tap from the doors. Finishing or declining records `tourSeenISO`
 * so it never asks again; replaying it from the documentation page
 * changes nothing.
 *
 * Each step navigates to its screen, waits for its `data-tour` target to
 * render, scrolls it into view and cuts a hole in the scrim around it.
 * A target that never appears leaves the card centred rather than
 * skipping the step: the words are the tour, the highlight is a pointer.
 */

/** How long to wait for a step's target before settling for a centred card. */
const TARGET_TIMEOUT_MS = 2000
/** Breathing room between the target and the edge of the hole. */
const PAD = 8
/** Where a scrolled target's top lands: just under the fixed app bar. */
const TARGET_TOP = 96
/** Gap between the hole and the card. */
const GAP = 12
/** The front page answers to three addresses. */
const FRONT = ['/', '/home', '/sos']

interface Hole {
  top: number
  left: number
  width: number
  height: number
}

/** The tab bar and the menu button are fixed, and scrolling to them only moves the page. */
function isFixed(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (getComputedStyle(node).position === 'fixed') return true
  }
  return false
}

function sameScreen(pathname: string, path: string): boolean {
  return pathname === path || (FRONT.includes(path) && FRONT.includes(pathname))
}

export default function Tour() {
  const index = useTourStep()
  const { profile, ready, update } = useHairProfile()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const [hole, setHole] = useState<Hole | null>(null)
  /** False while a step is still looking for its target, so the card does not jump. */
  const [placed, setPlaced] = useState(false)
  /** The card's own height, so it can be put where it fits rather than where it probably fits. */
  const [cardHeight, setCardHeight] = useState(0)
  const card = useRef<HTMLElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const offered = useRef(false)

  const step = index === null ? undefined : TOUR_STEPS[index]
  const active = step !== undefined
  const last = index === TOUR_STEPS.length - 1

  // Offer it once per launch, on the front page, to a profile that has
  // never seen it. `ready` first: until the disk read resolves the
  // profile is empty, and an empty profile has never seen anything.
  useEffect(() => {
    if (offered.current || !ready || profile.tourSeenISO) return
    if (!FRONT.includes(pathname)) return
    offered.current = true
    startTour()
  }, [ready, profile.tourSeenISO, pathname])

  const finish = useCallback(() => {
    endTour()
    if (!profile.tourSeenISO) update({ tourSeenISO: new Date().toISOString() })
  }, [profile.tourSeenISO, update])

  // Back on Android means "not now", same as Skip.
  useBackDismiss(active, finish)

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [active, finish])

  // Go to the step's screen.
  useEffect(() => {
    if (step && !sameScreen(pathname, step.path)) navigate(step.path)
  }, [step, pathname, navigate])

  // Find the target once the screen is there, then follow it.
  useLayoutEffect(() => {
    setHole(null)
    setPlaced(false)
    if (!step) return
    if (!step.target) {
      setPlaced(true)
      return
    }
    if (!sameScreen(pathname, step.path)) return

    const selector = `[data-tour="${step.target}"]`
    let frame = 0
    let element: Element | null = null
    const started = performance.now()

    const measure = () => {
      if (!element) return
      const r = element.getBoundingClientRect()
      setHole({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      })
    }

    const look = () => {
      element = document.querySelector(selector)
      if (element) {
        // Top-anchored rather than centred: a tall target centred leaves
        // a strip either side and room for the card in neither.
        if (!isFixed(element)) {
          const top = element.getBoundingClientRect().top
          window.scrollTo(0, window.scrollY + top - TARGET_TOP)
        }
        // One more frame so the measurement is taken after the scroll.
        frame = requestAnimationFrame(() => {
          measure()
          setPlaced(true)
        })
        return
      }
      if (performance.now() - started > TARGET_TIMEOUT_MS) {
        setPlaced(true)
        return
      }
      frame = requestAnimationFrame(look)
    }
    frame = requestAnimationFrame(look)

    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [step, pathname])

  useEffect(() => {
    const node = card.current
    if (!node) return
    const observer = new ResizeObserver(() => setCardHeight(node.offsetHeight))
    observer.observe(node)
    return () => observer.disconnect()
  }, [active])

  // Focus follows the card, so a screen reader hears each step.
  useEffect(() => {
    if (placed) primary.current?.focus()
  }, [placed, index])

  if (!step || index === null) return null

  const welcome = index === 0
  const viewportHeight = window.innerHeight

  /**
   * Below the target if the card fits there, above it if it fits there,
   * and otherwise laid over the foot of the screen — a card that runs off
   * the bottom hides the button that moves the tour on.
   */
  let position: React.CSSProperties = { top: '50%', transform: 'translateY(-50%)' }
  if (hole) {
    const needed = cardHeight + GAP * 2
    const above = hole.top
    const below = viewportHeight - (hole.top + hole.height)
    if (below >= needed) {
      position = { top: hole.top + hole.height + GAP }
    } else if (above >= needed) {
      position = { bottom: viewportHeight - hole.top + GAP }
    } else {
      position = { bottom: 'calc(1rem + var(--safe-bottom))' }
    }
  }

  return (
    <div className="fixed inset-0 z-[80]">
      {/* The scrim, in four pieces around the hole so the colour stays a
          token rather than a box-shadow literal. It also swallows taps:
          the tour is the one thing on screen until it is closed. */}
      {hole ? (
        <>
          <div
            className="absolute inset-x-0 top-0 bg-inverse-surface/60"
            style={{ height: Math.max(0, hole.top) }}
          />
          <div
            className="absolute inset-x-0 bottom-0 bg-inverse-surface/60"
            style={{ top: hole.top + hole.height }}
          />
          <div
            className="absolute left-0 bg-inverse-surface/60"
            style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }}
          />
          <div
            className="absolute right-0 bg-inverse-surface/60"
            style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }}
          />
          <div
            aria-hidden="true"
            className="absolute rounded-2xl ring-2 ring-secondary transition-all duration-200"
            style={hole}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-inverse-surface/60" />
      )}

      <section
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className={`fixed inset-x-0 mx-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-surface-container-lowest p-lg shadow-xl transition-opacity duration-150 ${
          placed ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={position}
      >
        <div className="mb-sm flex items-center gap-sm">
          <Icon name="explore" className="text-secondary" />
          <p className="font-label-md text-caption uppercase tracking-widest text-on-surface-variant">
            {welcome ? 'Tour' : `${index} of ${TOUR_STEPS.length - 1}`}
          </p>
        </div>
        <h2 id="tour-title" className="mb-xs font-headline-md text-headline-md text-on-surface">
          {step.title}
        </h2>
        <p id="tour-body" className="mb-lg font-body-md text-body-md text-on-surface-variant">
          {step.body}
        </p>

        {welcome ? (
          <div className="flex flex-col gap-sm">
            <button
              ref={primary}
              type="button"
              onClick={() => goToStep(1)}
              className="w-full rounded-full bg-primary py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
            >
              Show me around
            </button>
            <button
              type="button"
              onClick={finish}
              className="w-full rounded-full py-3 font-label-md text-label-md text-on-surface-variant transition-all active:scale-95"
            >
              Not now
            </button>
          </div>
        ) : last ? (
          <div className="flex flex-col gap-sm">
            <button
              ref={primary}
              type="button"
              onClick={finish}
              className="w-full rounded-full bg-primary py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                finish()
                navigate('/docs')
              }}
              className="flex w-full items-center justify-center gap-sm rounded-full border border-outline-variant py-3 font-label-md text-label-md text-on-surface transition-all active:scale-95"
            >
              <Icon name="menu_book" className="text-[18px]" />
              Read the documentation
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={finish}
              className="rounded-full px-md py-3 font-label-md text-label-md text-on-surface-variant transition-all active:scale-95"
            >
              Skip
            </button>
            <span className="flex-1" />
            {index > 1 && (
              <button
                type="button"
                onClick={() => goToStep(index - 1)}
                aria-label="Previous step"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant text-on-surface transition-all active:scale-95"
              >
                <Icon name="arrow_back" className="text-[20px]" />
              </button>
            )}
            <button
              ref={primary}
              type="button"
              onClick={() => goToStep(index + 1)}
              className="flex items-center gap-xs rounded-full bg-primary px-lg py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
            >
              Next
              <Icon name="arrow_forward" className="text-[18px]" />
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
