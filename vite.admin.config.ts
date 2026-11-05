import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { defineConfig } from 'vite'

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

export default defineConfig({
  root: admin(''),
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss({ config: admin('tailwind.config.js') }), autoprefixer()],
    },
  },
  server: { port: 5174 },
  build: {
    outDir: admin('dist'),
    emptyOutDir: true,
  },
})
