/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute origin of the deployed Vercel functions, e.g.
   * https://afro-coily-hair.vercel.app — required for the Android build, which
   * has no same-origin server to fall back on.
   */
  readonly VITE_API_BASE_URL?: string
  /**
   * Absolute URL of the landing site's `latest.json`, e.g.
   * https://afrocoil.example/latest.json. The APK reads it to tell the
   * user a newer build has been posted. Unset, the build never checks.
   */
  readonly VITE_UPDATE_MANIFEST_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
