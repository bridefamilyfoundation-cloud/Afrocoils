import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Which pushed update this bundle is (see `BundleRelease` in types.ts).
 *
 * `npm run ota:publish` sets VITE_BUNDLE_CODE to the code it is about to
 * publish. Every other build — the APK included — takes the newest code
 * already published, from site/release.json, so a freshly installed APK
 * is not offered a bundle older than itself.
 */
function bundleCode(): number {
  const forced = Number(process.env.VITE_BUNDLE_CODE)
  if (Number.isInteger(forced) && forced >= 0) return forced
  try {
    const release = JSON.parse(readFileSync(new URL('./site/release.json', import.meta.url), 'utf8'))
    return Number(release.bundle?.code) || 0
  } catch {
    return 0
  }
}

/**
 * Refuse to build with a Supabase key that would be inlined.
 *
 * Anything VITE_-prefixed is compiled into the bundle and ships inside
 * the APK — and now inside every pushed update too — where it can be read
 * out by anyone who downloads it. The service key bypasses row-level
 * security, so that slip is a public write to the whole database, and
 * it is silent. The app has no use for any Supabase key: it talks to the
 * Edge Function, which holds its own.
 */
function assertNoSupabaseKeyInClient(mode: string) {
  const leaked = Object.keys(loadEnv(mode, process.cwd(), 'VITE_')).filter((key) =>
    /SUPABASE.*(KEY|SECRET|TOKEN)/i.test(key),
  )
  if (leaked.length > 0) {
    throw new Error(
      `${leaked.join(', ')} would be inlined into the APK. Supabase keys never belong in a VITE_ variable — remove it.`,
    )
  }
}

export default defineConfig(({ mode }) => {
  assertNoSupabaseKeyInClient(mode)
  return {
    plugins: [react()],
    define: {
      __BUNDLE_CODE__: JSON.stringify(bundleCode()),
    },
    build: {
      // Capacitor copies this directory into the Android assets bundle,
      // and `npm run ota:publish` zips it as a pushed update.
      outDir: 'dist',
    },
    optimizeDeps: {
      // Left alone, the dependency scan crawls every .html under the root,
      // site/index.html included, and fails on its `virtual:site-facts`
      // import, which only vite.site.config.ts provides.
      entries: ['index.html'],
    },
    server: {
      // `cap run android --livereload` points the device at this host/port.
      host: true,
      port: 5173,
      /*
       * `/submissions` in development.
       *
       * Vite serves static files and knows nothing about the Edge Function,
       * so the submit screen's one network call has nowhere to land under
       * `npm run dev`. Point DEV_API_PROXY at a functions base
       * (`https://<ref>.supabase.co/functions/v1`, or the one
       * `supabase functions serve` prints) to test against it.
       *
       * Not a fallback to production by default: a dev build silently
       * writing into the live moderation queue is the kind of default that
       * is discovered by a reviewer.
       */
      proxy: process.env.DEV_API_PROXY
        ? {
            '/submissions': {
              target: process.env.DEV_API_PROXY,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
  }
})
