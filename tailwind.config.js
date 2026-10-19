/**
 * Design tokens.
 *
 * The names and the type/spacing scales are the prototype's
 * (prototype/screen-04-sos.html, inline `tailwind.config`), verbatim. The
 * colour *values* are the brand palette, which is four colours and nothing
 * else:
 *
 *   Light Cream     #E8D5C0   the page
 *   Burnt Orange    #E2583E   actions and the panels that carry them
 *                             (was #E8560C until 2026-10-19; the peach tints
 *                             below are mixed from it toward white)
 *   Dark Chocolate  #5A2108   headings and text
 *   Deep Espresso   #3F1708   the hair illustration, and the deepest text
 *
 * Those four are declared under `brand` below and every M3 role is derived
 * from them, so there is one place to change and no hex in a component.
 *
 * How the two dominant roles divide is the thing to know before editing:
 *
 * - **`primary` is the chocolate, not the orange.** `text-primary` is the
 *   app's heading colour in 88 places, and burnt orange on light cream is
 *   2.5:1 — unreadable. Chocolate on cream is 8.9:1. So the orange lives in
 *   `primary-container`, `secondary` and `surface-tint`: roles that are
 *   *filled*, where it carries cream text on top of it and reads the way it
 *   does in the reference screens.
 * - Every pairing below was checked against its `on-` colour. The one that
 *   sits at 3.6:1 is white on burnt orange, which is the brand's own
 *   combination and is only used at large bold sizes (the Get Started
 *   button, badges).
 *
 * If the prototype changes, diff its config against this file rather than
 * re-deriving values — and translate any colour it brings into these four.
 */
import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* The brand palette. Everything below is derived from these four. */
        'brand-cream': '#E8D5C0',
        'brand-orange': '#E2583E',
        'brand-chocolate': '#5A2108',
        'brand-espresso': '#3F1708',

        /* Page and surfaces. Cards float *lighter* than the cream page. */
        background: '#E8D5C0',
        surface: '#E8D5C0',
        'surface-bright': '#F5E9DC',
        'surface-dim': '#D8C0A4',
        'surface-container-lowest': '#FBF4EC',
        'surface-container-low': '#F6EBDF',
        'surface-container': '#F1E3D4',
        'surface-container-high': '#EADAC7',
        'surface-container-highest': '#E2CFB8',
        'surface-variant': '#E2CFB8',
        'surface-tint': '#E2583E',

        /* Text and lines. */
        'on-background': '#5A2108',
        'on-surface': '#5A2108',
        'on-surface-variant': '#6E4126',
        outline: '#9A7250',
        'outline-variant': '#C9AC8B',

        /* Primary — the chocolate. Heading text, and fills that carry white. */
        primary: '#5A2108',
        'on-primary': '#FFFFFF',
        'primary-container': '#E2583E',
        'on-primary-container': '#FFF3EA',
        'primary-fixed': '#F7DFC8',
        'on-primary-fixed': '#3F1708',
        'on-primary-fixed-variant': '#6E4126',
        'primary-fixed-dim': '#EFA597',

        /* Secondary — the burnt orange, always as a fill under cream or white. */
        secondary: '#E2583E',
        'on-secondary': '#FFFFFF',
        'secondary-container': '#F1B1A5',
        'on-secondary-container': '#5A2108',
        'secondary-fixed': '#F6C9C1',
        'on-secondary-fixed': '#4A1C07',
        'on-secondary-fixed-variant': '#7A3A16',
        'secondary-fixed-dim': '#ED9787',

        /* Tertiary — the espresso, for the deepest accents. */
        tertiary: '#3F1708',
        'on-tertiary': '#FFFFFF',
        'tertiary-container': '#5A2108',
        'on-tertiary-container': '#FFF3EA',
        'tertiary-fixed': '#F3DCC6',
        'on-tertiary-fixed': '#3F1708',
        'on-tertiary-fixed-variant': '#6E4126',
        'tertiary-fixed-dim': '#E0BC97',

        /* Inverse, and the one colour that is not from the palette: error. */
        'inverse-surface': '#3F1708',
        'inverse-on-surface': '#F6EBDF',
        'inverse-primary': '#EFA597',
        error: '#BA1A1A',
        'on-error': '#FFFFFF',
        'error-container': '#FFDAD6',
        'on-error-container': '#93000A',
      },
      /* Rounder than the prototype's, after the reference design: cards
         sit at 20-24px, images inside them a step below. */
      borderRadius: {
        DEFAULT: '0.375rem',
        lg: '0.875rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        full: '9999px',
      },
      /* Cards float on the page by shadow rather than by border. Both are
         the espresso at low alpha, so the shadow is a deeper cream, never
         grey. */
      boxShadow: {
        card: '0 6px 20px -6px rgb(63 23 8 / 0.12)',
        float: '0 12px 28px -8px rgb(63 23 8 / 0.35)',
      },
      spacing: {
        '2xl': '48px',
        md: '16px',
        xs: '4px',
        gutter: '16px',
        base: '4px',
        lg: '24px',
        'container-padding': '20px',
        sm: '8px',
        xl: '32px',
      },
      /*
       * One family, Plus Jakarta Sans, after the reference mockup adopted in
       * October 2026: a bold geometric sans for headings, the same
       * family at regular weight for body. The token names are still the
       * prototype's, so no call site changes when the face does.
       */
      fontFamily: {
        'headline-md': ['Plus Jakarta Sans', 'sans-serif'],
        'label-md': ['Plus Jakarta Sans', 'sans-serif'],
        'headline-lg': ['Plus Jakarta Sans', 'sans-serif'],
        'display-lg': ['Plus Jakarta Sans', 'sans-serif'],
        'body-lg': ['Plus Jakarta Sans', 'sans-serif'],
        'body-md': ['Plus Jakarta Sans', 'sans-serif'],
        'headline-lg-mobile': ['Plus Jakarta Sans', 'sans-serif'],
        caption: ['Plus Jakarta Sans', 'sans-serif'],
      },
      /* The body sizes carry no weight of their own, so a heading face set
         at a body size (`font-headline-md text-body-lg`, the app's card
         title) keeps the bold from src/index.css instead of dropping to
         regular. Body text inherits 400 from the page. */
      fontSize: {
        'headline-md': ['22px', { lineHeight: '30px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'headline-lg': ['32px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['44px', { lineHeight: '50px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        'headline-lg-mobile': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '700' }],
        caption: ['12px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [forms],
}
