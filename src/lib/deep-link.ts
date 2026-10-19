import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * `?open=<id>` — the way Ask (or any link) lands on one panel of a long
 * screen rather than at its top.
 *
 * A query parameter, not an `#anchor`: routing is hash-based, so a
 * second `#` would be read as part of the route. Screens with an
 * accordion seed their open panel from it; `useScrollToOpened` then
 * brings that panel into view.
 */
export function useOpenParam(): string | null {
  const [params] = useSearchParams()
  return params.get('open')
}

/**
 * Scroll the element with this id into view once the screen has laid
 * out.
 *
 * Two frames late on purpose. `AppLayout` scrolls to the top on every
 * forward navigation, and parent effects run after child effects, so a
 * scroll issued from the screen's own effect would be undone by the
 * layout a moment later. `ready` holds it back on a screen that renders
 * a placeholder until the profile has loaded.
 */
export function useScrollToOpened(elementId: string | null, ready = true): void {
  useEffect(() => {
    if (!elementId || !ready) return
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() =>
        document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    })
    return () => cancelAnimationFrame(frame)
  }, [elementId, ready])
}
