import { Capacitor } from '@capacitor/core'
import { initBackButton } from '../lib/back-button'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

/** True when running inside the Capacitor Android shell rather than a browser. */
export const isNative = Capacitor.isNativePlatform()

/**
 * One-time native chrome setup. Every call is guarded because these plugins
 * throw when the web build runs in a plain browser (`npm run dev`).
 */
export function initNativeShell(): void {
  if (!isNative) return

  // The palette is light with a cream background, so the status bar needs dark
  // icons to stay legible.
  void StatusBar.setStyle({ style: Style.Light })
  void StatusBar.setBackgroundColor({ color: '#E8D5C0' })

  // Resize the WebView rather than pan it, so a focused input scrolls into
  // view without the fixed bottom nav riding up over the keyboard.
  void Keyboard.setResizeMode({ mode: KeyboardResize.Native })

  // Back closes whatever is open over the page before it navigates.
  // Registering this overrides Capacitor's default handling, so the
  // listener takes on the navigate-or-exit case too.
  initBackButton()

  void SplashScreen.hide()
}
