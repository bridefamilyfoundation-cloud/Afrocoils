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

  // Resize the WebView rather than pan it, so a focused input scrolls
  // into view. The viewport then ends at the top of the keyboard, which
  // is where anything fixed to the bottom sits: the tab bar and the Ask
  // button would cover the foot of a form. `keyboard-open` on the root
  // hides them for as long as the keyboard is up (index.css).
  void Keyboard.setResizeMode({ mode: KeyboardResize.Native })
  const root = document.documentElement
  void Keyboard.addListener('keyboardWillShow', () => root.classList.add('keyboard-open'))
  void Keyboard.addListener('keyboardDidHide', () => root.classList.remove('keyboard-open'))

  // Back closes whatever is open over the page before it navigates.
  // Registering this overrides Capacitor's default handling, so the
  // listener takes on the navigate-or-exit case too.
  initBackButton()

  void SplashScreen.hide()
}
