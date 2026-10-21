/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The project's Edge Functions, e.g.
   * https://runhkccoeyxfgsfrzezn.supabase.co/functions/v1 — required for
   * the Android build, which has no same-origin server to fall back on.
   */
  readonly VITE_API_BASE_URL?: string
  /**
   * Absolute URL of `latest.json` in the public `releases` bucket. The APK
   * reads it to learn that a newer APK or a pushed update exists. Unset,
   * the build never checks.
   */
  readonly VITE_UPDATE_MANIFEST_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * Which pushed update this web bundle is: `BundleRelease.code`, baked in
 * by vite.config.ts. An APK's own bundle carries the code that was
 * current when it was built, so it is never offered an update it already
 * contains.
 */
declare const __BUNDLE_CODE__: number
