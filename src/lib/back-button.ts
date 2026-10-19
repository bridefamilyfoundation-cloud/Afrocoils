import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * The Android back button.
 *
 * On Android, back is the dismiss gesture. Before this existed the app
 * had no idea the button had been pressed: the drawer listened for
 * `Escape` — a key the target device does not have — and every inline
 * confirmation listened for nothing at all. Pressing back with the
 * drawer open navigated the page underneath it, or exited the app at the
 * root, leaving the panel sitting over whatever was left.
 *
 * The model is a stack of dismissible layers. Anything that is "open
 * over" the page registers while it is open; back closes the topmost one
 * and stops there. Only when nothing is registered does it mean
 * "navigate", which is the meaning the WebView would have given it
 * anyway.
 *
 * A stack rather than a single handler because the layers genuinely
 * nest: the withdraw confirmation opens inside the submissions list,
 * which can be open under the drawer. Closing them in the order they
 * were opened is what the gesture is expected to do.
 *
 * Registering a listener at all overrides Capacitor's own default
 * handling, so the fall-through below has to do that job itself — go
 * back where there is history, exit where there is not.
 */

type Dismiss = () => void

const layers: Dismiss[] = []

/** Register a dismissible layer. Returns the function that unregisters it. */
export function pushDismissible(dismiss: Dismiss): () => void {
  layers.push(dismiss)
  return () => {
    const index = layers.lastIndexOf(dismiss)
    if (index >= 0) layers.splice(index, 1)
  }
}

/**
 * Close this layer on back, while `active`.
 *
 * `onDismiss` is held in a ref so that an inline arrow — which every
 * caller passes — does not unregister and re-register the layer on each
 * render, briefly reordering the stack under a press.
 */
export function useBackDismiss(active: boolean, onDismiss: Dismiss): void {
  const handler = useRef(onDismiss)
  handler.current = onDismiss

  useEffect(() => {
    if (!active) return
    return pushDismissible(() => handler.current())
  }, [active])
}

/**
 * Wire the hardware button. Called once, from the native shell.
 *
 * No-ops in the browser, where there is no such button and the plugin is
 * unavailable.
 */
export function initBackButton(): void {
  if (!Capacitor.isNativePlatform()) return

  void App.addListener('backButton', ({ canGoBack }) => {
    const top = layers[layers.length - 1]
    if (top) {
      top()
      return
    }
    // Nothing open over the page, so back means what it usually means.
    if (canGoBack) window.history.back()
    else void App.exitApp()
  })
}
