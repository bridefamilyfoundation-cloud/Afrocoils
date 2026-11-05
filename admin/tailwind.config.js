/**
 * The admin site's Tailwind config: the app's, with the admin's files as
 * content. Add a token to the root config, not here.
 */
import { fileURLToPath } from 'node:url'
import app from '../tailwind.config.js'

/** @type {import('tailwindcss').Config} */
export default {
  ...app,
  content: [fileURLToPath(new URL('./{index.html,src/**/*.{ts,tsx}}', import.meta.url))],
}
