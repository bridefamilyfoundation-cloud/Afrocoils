import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Icon from './Icon'

/**
 * Ask, from every screen: the floating button at the bottom right, above
 * the tab bar's right end, where a thumb already is.
 *
 * The button is all that ships with the layout. The conversation it
 * opens (AskSheet) brings the engine and every content file it indexes,
 * so it loads on the first tap and stays loaded for the session.
 *
 * Following any link in a reply closes the sheet, so the screen it
 * pointed at is what you see — the conversation is still there next time.
 */
const AskSheet = lazy(() => import('./AskSheet'))

export default function AskLauncher() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])

  // A link in a reply moved the app somewhere: show it.
  useEffect(() => setOpen(false), [location.key])

  // `/ask` is the same thing full screen; a button for it there would
  // open a second copy of the screen you are on.
  const hidden = location.pathname === '/ask'

  return (
    <>
      {!hidden && !open && (
        <button
          ref={opener}
          type="button"
          onClick={() => {
            setLoaded(true)
            setOpen(true)
          }}
          aria-label="Ask AfroCoils a question"
          aria-haspopup="dialog"
          data-tour="ask-button"
          className="app-chrome fixed right-gutter z-50 flex h-12 items-center gap-xs rounded-full bg-secondary px-lg text-on-secondary shadow-float transition-all active:scale-90"
          // Just clear of the tab bar (60px pill + 12px inset).
          style={{ bottom: 'calc(5rem + var(--safe-bottom))' }}
        >
          <Icon name="forum" />
          <span className="font-label-md text-label-md font-bold">Ask</span>
        </button>
      )}

      {loaded && (
        <Suspense fallback={null}>
          <AskSheet open={open} onClose={close} opener={opener} />
        </Suspense>
      )}
    </>
  )
}
