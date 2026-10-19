import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // Capacitor copies this directory into the Android assets bundle.
    outDir: 'dist',
  },
  server: {
    // `cap run android --livereload` points the device at this host/port.
    host: true,
    port: 5173,
    /*
     * `/api` in development.
     *
     * Vite serves static files and knows nothing about the serverless
     * functions in `api/`, so the submit screen's one network call has
     * nowhere to land under `npm run dev`. Two ways to give it one:
     *
     *   - `vercel dev` instead, which runs the functions locally. Nothing
     *     here is needed for that; leave DEV_API_PROXY unset.
     *   - Point DEV_API_PROXY at a deployed instance to test the device
     *     against the real backend without rebuilding the APK.
     *
     * Not a fallback to production by default: a dev build silently
     * writing into the live moderation queue is the kind of default that
     * is discovered by a reviewer.
     */
    proxy: process.env.DEV_API_PROXY
      ? {
          '/api': {
            target: process.env.DEV_API_PROXY,
            changeOrigin: true,
            secure: true,
          },
        }
      : undefined,
  },
})
