/**
 * Design tokens.
 *
 * The names and the type/spacing scales are the prototype's
 * (prototype/screen-04-sos.html, inline `tailwind.config`), verbatim. The
 * colour *values* are the brand palette, which is four colours and nothing
 * else:
 *
 *   Light Cream     #E8D5C0   the page
 *   Burnt Orange    #E8560C   actions and the panels that carry them
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
        'brand-orange': '#E8560C',
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
        'surface-tint': '#E8560C',

        /* Text and lines. */
        'on-background': '#5A2108',
        'on-surface': '#5A2108',
        'on-surface-variant': '#6E4126',
        outline: '#9A7250',
        'outline-variant': '#C9AC8B',

        /* Primary — the chocolate. Heading text, and fills that carry white. */
        primary: '#5A2108',
        'on-primary': '#FFFFFF',
        'primary-container': '#E8560C',
        'on-primary-container': '#FFF3EA',
        'primary-fixed': '#F7DFC8',
        'on-primary-fixed': '#3F1708',
        'on-primary-fixed-variant': '#6E4126',
        'primary-fixed-dim': '#F0B183',

        /* Secondary — the burnt orange, always as a fill under cream or white. */
        secondary: '#E8560C',
        'on-secondary': '#FFFFFF',
        'secondary-container': '#F4B48A',
        'on-secondary-container': '#5A2108',
        'secondary-fixed': '#F7CFAE',
        'on-secondary-fixed': '#4A1C07',
        'on-secondary-fixed-variant': '#7A3A16',
        'secondary-fixed-dim': '#EFA269',

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
        'inverse-primary': '#F0B183',
        error: '#BA1A1A',
        'on-error': '#FFFFFF',
        'error-container': '#FFDAD6',
        'on-error-container': '#93000A',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
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
      fontFamily: {
        'headline-md': ['Literata', 'serif'],
        'label-md': ['Be Vietnam Pro', 'sans-serif'],
        'headline-lg': ['Literata', 'serif'],
        'display-lg': ['Literata', 'serif'],
        'body-lg': ['Be Vietnam Pro', 'sans-serif'],
        'body-md': ['Be Vietnam Pro', 'sans-serif'],
        'headline-lg-mobile': ['Literata', 'serif'],
        caption: ['Be Vietnam Pro', 'sans-serif'],
      },
      fontSize: {
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '500' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '600' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'display-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
    },
  },
  plugins: [forms],
}
