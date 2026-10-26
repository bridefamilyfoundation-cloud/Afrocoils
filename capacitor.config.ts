import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.afrocoils.app',
  appName: 'AfroCoils',
  webDir: 'dist',
  android: {
    // Light Cream, the brand's page colour — the same value `background`
    // carries in tailwind.config.js and the same one initNativeShell
    // paints the status bar. It used to be #fdf9f6, a near-white, which
    // meant every cold start flashed white and dropped to cream while
    // this comment claimed it did not.
    backgroundColor: '#E8D5C0',
  },
  plugins: {
    SplashScreen: {
      // Hidden manually in src/native/shell.ts once React has mounted.
      launchAutoHide: false,
      backgroundColor: '#E8D5C0',
    },
    Keyboard: {
      resize: 'native',
    },
    /*
     * Pushed updates (src/lib/updates.ts), in manual mode only.
     *
     * The plugin's defaults would quietly break the app's privacy promise:
     * out of the box it checks Capgo's servers for updates and reports
     * update events, crashes, ANRs and WebView errors to them. Every
     * endpoint is blanked here, which the native code treats as "send
     * nothing", and automatic updating is off — the app decides when to
     * check (its own latest.json) and the user decides when to install.
     * Do not set any of these URLs without rewriting the privacy policy
     * first; see CLAUDE.md.
     */
    CapacitorUpdater: {
      autoUpdate: false,
      updateUrl: '',
      statsUrl: '',
      channelUrl: '',
      // A bundle that does not call notifyAppReady() within this long of
      // loading is treated as broken and the previous one restored.
      appReadyTimeout: 15000,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      // A newer APK carries its own, newer bundle: drop pushed ones.
      resetWhenUpdate: true,
    },
  },
}

export default config
