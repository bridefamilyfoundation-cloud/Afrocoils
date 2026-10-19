/**
 * The landing site's Tailwind config: the app's, with the site's files as
 * content. Colours, spacing and type all come from the root config, so the
 * page and the app cannot drift apart — add a token there, not here.
 */
import { fileURLToPath } from 'node:url'
import app from '../tailwind.config.js'

/** @type {import('tailwindcss').Config} */
export default {
  ...app,
  content: [fileURLToPath(new URL('./**/*.{html,ts}', import.meta.url))],
}
