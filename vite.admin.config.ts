import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { defineConfig, type Plugin } from 'vite'

/**
 * The admin site: members and payments, the support inbox, the style
 * queue and the Ask log, at admin.afrocoils.app. `npm run admin:dev` /
 * `npm run admin:build` → `admin/dist/`.
 *
 * Its own config and its own Vercel project (admin/vercel.json), for the
 * reason the landing site has one: the app's `dist/` is copied whole
 * into the APK, and an admin console has no business inside it. It
 * shares the app's tokens and font, and loads nothing from another
 * origin except the API it administers.
 */
const admin = (path: string) => fileURLToPath(new URL(`./admin/${path}`, import.meta.url))

/**
 * Keeps the framework's version out of what the site serves. React's
 * production build still writes its exact version into the bundle, for
 * DevTools and a mismatch check; every copy is replaced with the same
 * placeholder, so the check still passes, and a scanner reading the
 * bundle learns no version to look up advisories for.
 */
function hideVersions(): Plugin {
  const version = (JSON.parse(readFileSync(new URL('./node_modules/react/package.json', import.meta.url), 'utf8')) as {
    version: string
  }).version
  return {
    name: 'afrocoils:hide-versions',
    apply: 'build',
    renderChunk: (code) => (code.includes(version) ? code.split(version).join('0') : null),
  }
}

export default defineConfig({
  root: admin(''),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), hideVersions()],
  // React DevTools cannot attach to the deployed admin site.
  define: { __REACT_DEVTOOLS_GLOBAL_HOOK__: '({ isDisabled: true })' },
  css: {
    postcss: {
      plugins: [tailwindcss({ config: admin('tailwind.config.js') }), autoprefixer()],
    },
  },
  server: { port: 5174 },
  build: {
    outDir: admin('dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
})
