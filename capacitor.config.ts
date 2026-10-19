import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.afrocoilyhair.app',
  appName: 'Afrocoil',
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
  },
}

export default config
