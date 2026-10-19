import Icon from './Icon'

/**
 * The app's one waiting state.
 *
 * Two different waits land on the same screen and should look the same:
 * the lazy chunk arriving (`Suspense` in App.tsx) and the hair profile
 * being read off disk (the `ready` guard at the top of every screen that
 * needs it). Both are brief, neither is an error, and both used to be
 * drawn differently — the first as this, the second as `return null`,
 * which is chrome around an empty page and reads as a screen that has
 * failed rather than one that is a few milliseconds away.
 *
 * `role="status"` rather than a spinner alone, so the wait is announced
 * instead of being a silent gap for anyone not looking at the animation.
 */
export default function ScreenFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <Icon name="more_horiz" className="animate-pulse text-3xl text-outline" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
