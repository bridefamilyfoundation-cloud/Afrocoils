import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { defineConfig, type Plugin } from 'vite'
import { ABOUT_INTRO } from './src/content/about'
import { FOUNDER, PLATFORM_LABEL, founderLinkGroups, founderReady, type SocialPlatform } from './src/content/founder'
import { GUIDES } from './src/content/guides'
import { HAIR_CHECK } from './src/content/hair-check'
import { LOC_CARE } from './src/content/loc-care'
import { STYLES } from './src/content/styles'
import { TIME_BANDS, type UpdateManifest } from './src/lib/types'
// @ts-expect-error: a plain .mjs module, shared with the release scripts.
import { SITE_URL as SITE_ROOT } from './scripts/lib/release-manifest.mjs'

/**
 * The landing site: the public page that describes the app and serves the
 * APK. `npm run site:dev` / `npm run site:build` → `dist-site/`.
 *
 * Its own config rather than a second entry in vite.config.ts, because the
 * app's `dist/` is copied wholesale into the APK by `cap sync` and a
 * marketing page has no business inside the app it advertises.
 *
 * It shares the app's design tokens (site/tailwind.config.js extends the
 * root config), and its fonts and artwork come from the same npm packages
 * and files, so the page loads nothing from a third party — the same
 * stance the app takes, and the page says so in its footer.
 *
 * **Nothing the page states about the app is typed into it.** The counts,
 * the Locs World chapter list and the Quick Hairstyle examples are read
 * from `src/content/` here, at build time; the version, size, checksum and
 * minimum Android come from `site/release.json`, which
 * `scripts/site-release.mjs` writes from the APK itself. The HTML carries
 * `%token%` placeholders and `site/main.ts` imports `virtual:site-facts`.
 * Change the content and the page follows on the next build.
 */
const site = (path: string) => fileURLToPath(new URL(`./site/${path}`, import.meta.url))

/** The public address, without the trailing slash: canonical links, the sitemap and the structured data. */
const SITE_URL = (SITE_ROOT as string).replace(/\/$/, '')

/** Every page the site serves, as the sitemap lists them. The admin site is a separate project and is never here. */
const PAGES = [
  { path: '/', file: 'index.html' },
  { path: '/download/', file: 'download/index.html' },
]

/**
 * site/release.json: the manifest's fields, less the page link, plus the
 * package id, plus `download` — the site-relative path the APK is served
 * at. `url` is then only where the build fetches it from.
 */
type Release = Omit<UpdateManifest, 'page'> & { packageId: string; download?: string }

function readRelease(): Release {
  const path = site('release.json')
  if (!existsSync(path)) {
    throw new Error('site/release.json is missing. Run `npm run apk && npm run site:release`.')
  }
  const release = JSON.parse(readFileSync(path, 'utf8')) as Release
  // Written before release notes existed.
  return { ...release, notes: release.notes ?? [] }
}

/** `YYYY-MM-DD` → "12 September 2026", in local time (never Date.parse). */
function longDate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/* ------------------------------------------------------------------ *
 * Meet the Founder
 *
 * Read from src/content/founder.ts, the file the app's About screen
 * reads, and written into the page at build time, so it is there with
 * scripts off. Nothing is written until her biography has been supplied;
 * a link not supplied yet is left out. The three marks are the same
 * drawings the app uses (components/FounderCard.tsx), in the page's own
 * colours rather than each network's.
 * ------------------------------------------------------------------ */

const SOCIAL_ICON: Record<SocialPlatform, string> = {
  instagram:
    '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" /></svg>',
  youtube:
    '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5" fill="currentColor"><path fill-rule="evenodd" d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z" /></svg>',
  tiktok:
    '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>',
}

/** The founder's photograph, if it has been added: `src/assets/images/founder.<ext>`. */
function founderPhoto(): string | undefined {
  for (const ext of ['webp', 'avif', 'jpg', 'jpeg', 'png']) {
    const relative = `src/assets/images/${FOUNDER.photo}.${ext}`
    if (existsSync(fileURLToPath(new URL(`./${relative}`, import.meta.url)))) return `../${relative}`
  }
  return undefined
}

/** The whole Meet the Founder block, or nothing while the biography is still to come. */
function founderSection(): string {
  if (!founderReady()) return ''
  const photo = founderPhoto()
  const firstName = FOUNDER.name.split(' ')[0]
  const initials = FOUNDER.name
    .split(' ')
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .map((word) => word[0])
    .join('')

  const picture = photo
    ? `<img src="${photo}" alt="${escapeHtml(FOUNDER.photoAlt)}" loading="lazy" class="relative mx-auto aspect-[4/5] w-64 rounded-[28px] object-cover object-top shadow-2xl shadow-black/40 ring-4 ring-inverse-on-surface/90 md:mx-0 md:w-full" />`
    : `<div aria-hidden="true" class="relative mx-auto grid aspect-[4/5] w-64 place-items-center rounded-[28px] bg-primary-fixed font-headline-lg text-[56px] font-semibold text-on-primary-fixed ring-4 ring-inverse-on-surface/90 md:mx-0 md:w-full">${escapeHtml(initials)}</div>`

  const bio = FOUNDER.bio
    .map((paragraph) => `<p class="font-body-lg text-body-lg text-on-surface-variant">${escapeHtml(paragraph)}</p>`)
    .join('')

  const groups = founderLinkGroups()
    .map(
      (group) =>
        `<div><h5 class="mb-sm font-label-md text-caption font-semibold uppercase tracking-[0.18em] text-on-surface">${escapeHtml(group.title)}</h5>` +
        `<ul class="flex justify-center gap-sm md:justify-start">` +
        group.links
          .map(
            (link) =>
              `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(`${firstName} on ${PLATFORM_LABEL[link.platform]} (${group.title})`)}" class="grid h-12 w-12 place-items-center rounded-full bg-brand-espresso text-inverse-on-surface shadow-md transition-all hover:-translate-y-0.5 hover:bg-secondary hover:text-on-secondary active:scale-95">${SOCIAL_ICON[link.platform]}</a></li>`,
          )
          .join('') +
        `</ul></div>`,
    )
    .join('')

  // The head is espresso with cream type, the one dark block in a section
  // of cream and white, so it is what the eye lands on. Same shape as the
  // app's card (components/FounderCard.tsx).
  return (
    `<article id="founder" data-reveal class="mx-auto mt-lg max-w-5xl scroll-mt-24 overflow-hidden rounded-[36px] bg-surface-container-lowest shadow-2xl shadow-brand-chocolate/20 ring-1 ring-outline-variant/40">` +
    `<div class="relative grid gap-xl overflow-hidden bg-brand-espresso p-lg text-center text-inverse-on-surface sm:p-xl md:grid-cols-[280px_1fr] md:items-end md:text-left">` +
    `<span aria-hidden="true" class="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/25 blur-3xl"></span>` +
    picture +
    `<div class="relative">` +
    `<p class="mb-md inline-block rounded-full bg-secondary px-md py-1.5 font-label-md text-caption font-semibold uppercase tracking-[0.18em] text-on-secondary">Meet the Founder</p>` +
    `<h3 class="font-headline-lg text-[34px] font-semibold leading-tight tracking-tight sm:text-[48px]">${escapeHtml(FOUNDER.name)}</h3>` +
    `<p class="mt-sm font-label-md text-body-lg font-semibold text-primary-fixed-dim">${escapeHtml(FOUNDER.title)}</p>` +
    `<p class="mt-xs font-body-md text-body-md text-inverse-on-surface/80">${escapeHtml(FOUNDER.aka)}</p>` +
    `</div></div>` +
    `<div class="mx-auto max-w-3xl space-y-md p-lg sm:p-xl">${bio}<p class="font-headline-lg text-[22px] font-semibold text-primary">${escapeHtml(FOUNDER.tagline)}</p></div>` +
    (groups
      ? `<div class="bg-surface-container p-lg text-center sm:p-xl md:text-left"><div class="mx-auto max-w-3xl">` +
        `<h4 class="mb-xs font-headline-lg text-[24px] font-semibold text-primary">${escapeHtml(FOUNDER.connect.heading)}</h4>` +
        `<p class="font-body-md text-body-md text-on-surface-variant">${escapeHtml(FOUNDER.connect.body)}</p>` +
        `<div class="mt-lg grid gap-lg sm:grid-cols-2">${groups}</div></div></div>`
      : '') +
    `</article>`
  )
}

/**
 * Structured data for search: the site, the publisher and the app, with
 * its download. Built from release.json like every other number on the
 * page, and written into each page as a JSON-LD block (a data block, not
 * a script, so the CSP's hash list does not apply to it).
 */
function structuredData(release: Release): string {
  const download = `${SITE_URL}/${release.download ?? release.url}`
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: 'AfroCoils',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/og-image.png`,
      email: 'hello@afrocoils.app',
      parentOrganization: { '@type': 'Organization', name: 'Crown Space Limited' },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#site`,
      name: 'AfroCoils',
      url: `${SITE_URL}/`,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
    {
      '@type': 'MobileApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'AfroCoils',
      description:
        'The hair app for Type 4 natural hair, 4A, 4B and 4C, loose or loc\u2019d: quick hairstyles, hair care guides, growth tracking and a hair SOS that works offline.',
      operatingSystem: `Android ${release.minAndroid}+`,
      applicationCategory: 'LifestyleApplication',
      softwareVersion: release.version,
      datePublished: release.released,
      downloadUrl: download,
      installUrl: `${SITE_URL}/download/`,
      image: `${SITE_URL}/og-image.png`,
      url: `${SITE_URL}/`,
      publisher: { '@id': `${SITE_URL}/#org` },
      // The download is free; membership is priced in Paystack, not here.
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN', url: `${SITE_URL}/download/` },
    },
  ]
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

/** sitemap.xml: the site's own pages, dated by the release they describe. */
function sitemapXml(release: Release): string {
  const urls = PAGES.map(
    (page) => `  <url>\n    <loc>${SITE_URL}${page.path}</loc>\n    <lastmod>${release.released}</lastmod>\n  </url>`,
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

function facts() {
  const release = readRelease()

  /* What Quick Hairstyle shows for each band: the same filter the screen
     applies (minutes within the band), quickest first. */
  const bands = TIME_BANDS.map((band) => ({
    label: band.label,
    styles: STYLES.filter((s) => s.minutes >= band.min && s.minutes <= band.max)
      .sort((a, b) => a.minutes - b.minutes)
      .slice(0, 4)
      .map((s) => ({ name: s.name, minutes: s.minutes })),
  }))

  /* The Ask demo in the "written by people" section: one question, and the
     Quick Hair Check card Ask answers it with, built the way Ask titles it
     (the group's heading completed by the concern's label). */
  const ASK_QUESTION = 'my edges are thinning'
  const askGroup = HAIR_CHECK.find((group) => group.concerns.some((c) => c.id === 'edges-thinning'))
  const askConcern = askGroup?.concerns.find((c) => c.id === 'edges-thinning')
  if (!askGroup || !askConcern) throw new Error('The site\'s Ask demo needs the edges-thinning entry in src/content/hair-check.ts.')
  const askDemo = {
    question: ASK_QUESTION,
    title: `${askGroup.heading.replace(/…$/, '')} ${askConcern.label.toLowerCase()}`,
    problem: askConcern.problem,
    solutions: askConcern.solutions.slice(0, 3),
    more: Math.max(0, askConcern.solutions.length - 3),
  }

  const tokens: Record<string, string> = {
    'release.version': release.version,
    'release.versionCode': String(release.versionCode),
    'release.packageId': release.packageId,
    'release.minAndroid': release.minAndroid,
    'release.size': `${(release.bytes / 1e6).toFixed(1)} MB`,
    'release.sha256': release.sha256,
    'release.released': longDate(release.released),
    'release.releasedKey': release.released,
    // The site's own copy (see `serveApk`), never the bucket URL.
    'release.url': release.download ?? release.url,
    // The same, from the site root, for pages below it.
    'release.path': `/${release.download ?? release.url}`,
    'site.url': SITE_URL,
    'seo.jsonld': structuredData(release),
    'count.styles': String(STYLES.length),
    'count.guides': String(GUIDES.length),
    'count.concerns': String(HAIR_CHECK.reduce((n, group) => n + group.concerns.length, 0)),
    'count.locChapters': String(LOC_CARE.length),
    'band.first.label': bands[0].label,
    'band.first.count': String(STYLES.filter((s) => s.minutes <= TIME_BANDS[0].max).length),
    'bands.labels': TIME_BANDS.map((b) => b.label.replace(' min', '')).join(', ').replace(/, ([^,]*)$/, ' or $1'),
    // The owner's introduction and mission, as the app's About screen has them.
    'about.what': ABOUT_INTRO.find((item) => item.id === 'what')!
      .body.map((paragraph) => `<p class="font-body-lg text-body-lg text-on-surface-variant">${escapeHtml(paragraph)}</p>`)
      .join(''),
    'about.who': ABOUT_INTRO.find((item) => item.id === 'who')!
      .body.map((paragraph) => `<p class="font-body-md text-body-md text-on-surface-variant">${escapeHtml(paragraph)}</p>`)
      .join(''),
    'about.mission': escapeHtml(ABOUT_INTRO.find((item) => item.id === 'mission')!.body.join(' ')),
    'about.makers': ABOUT_INTRO.find((item) => item.id === 'makers')!
      .body.map((paragraph) => `<p class="font-body-md text-body-md text-on-surface-variant">${escapeHtml(paragraph)}</p>`)
      .join(''),
    'locs.chapters': LOC_CARE.map(
      (c) => `<li class="rounded-full bg-white/10 px-3 py-1 font-caption text-caption">${escapeHtml(c.title)}</li>`,
    ).join(''),
  }

  return { release, bands, askDemo, tokens }
}

function siteFacts(): Plugin {
  const VIRTUAL = 'virtual:site-facts'
  return {
    name: 'afrocoils:site-facts',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(readRelease()) })
    },
    resolveId: (id) => (id === VIRTUAL ? `\0${VIRTUAL}` : undefined),
    load(id) {
      if (id !== `\0${VIRTUAL}`) return
      const { release: { download, ...release }, bands, askDemo } = facts()
      const visible = { ...release, url: download ?? release.url }
      return `export const release = ${JSON.stringify(visible)}\nexport const bands = ${JSON.stringify(bands)}\nexport const askDemo = ${JSON.stringify(askDemo)}\n`
    },
    transformIndexHtml(html) {
      const { tokens } = facts()
      return html.replace(/%([a-zA-Z][a-zA-Z0-9.]*)%/g, (whole, key: string) => {
        if (!(key in tokens)) throw new Error(`site/index.html uses ${whole}, which vite.site.config.ts does not define.`)
        return tokens[key]
      })
    },
  }
}

/*
 * The site no longer publishes `latest.json`. Installed copies read it
 * from the `releases` bucket in Supabase Storage, where `site:release`
 * and `ota:publish` write it (scripts/lib/release-manifest.mjs) — so a
 * pushed update reaches phones without redeploying this site, and there
 * is one manifest rather than two that can disagree.
 */

/**
 * Writes Meet the Founder into the page *before* Vite reads it
 * (`order: 'pre'`), so her photograph is found and bundled like any
 * other image the page names. The site-facts tokens are filled in
 * afterwards, which is too late for an image address.
 */
function founder(): Plugin {
  return {
    name: 'afrocoils:founder',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace('%founder.section%', founderSection()),
    },
  }
}

/** Fails the build if the download button would point at nothing. */
function requireReleaseFile(): Plugin {
  return {
    name: 'afrocoils:require-release-file',
    apply: 'build',
    buildStart() {
      const { url } = readRelease()
      if (/^https?:\/\//.test(url)) return
      if (!existsSync(site(`public/${url}`))) {
        this.error(
          `site/release.json points at ${url}, which is not in site/public/. ` +
            'Run `npm run apk && npm run site:release` before building the site.',
        )
      }
    },
  }
}

const OUT_DIR = fileURLToPath(new URL('./dist-site', import.meta.url))

/**
 * Publishes the APK from the site's own domain, verified.
 *
 * The bucket URL in release.json is where the file is fetched from at
 * build time, not what visitors are sent to: the page links to
 * `release.download`, and this writes the file there. The build fails
 * unless the bytes match the size and SHA-256 that release.json — and so
 * the download card — states, so the site cannot serve a file that
 * differs from the one released, even if the bucket's copy is replaced.
 *
 * A local `apk-output/afrocoils.apk` with the right checksum is used
 * instead of downloading, which is the case right after `site:release`.
 */
function serveApk(): Plugin {
  return {
    name: 'afrocoils:serve-apk',
    apply: 'build',
    async closeBundle() {
      const release = readRelease()
      if (!release.download) return
      if (!/^download\/[A-Za-z0-9._-]+\.apk$/.test(release.download)) {
        throw new Error(`site/release.json: download must be download/<file>.apk, not ${release.download}`)
      }

      const matches = (bytes: Buffer) =>
        bytes.length === release.bytes && createHash('sha256').update(bytes).digest('hex') === release.sha256

      const local = fileURLToPath(new URL('./apk-output/afrocoils.apk', import.meta.url))
      let bytes = existsSync(local) ? readFileSync(local) : undefined
      if (!bytes || !matches(bytes)) {
        const response = await fetch(release.url)
        if (!response.ok) throw new Error(`Fetching the APK from ${release.url} failed (${response.status}).`)
        bytes = Buffer.from(await response.arrayBuffer())
      }
      if (!matches(bytes)) {
        throw new Error(
          `The APK at ${release.url} does not match the SHA-256 in site/release.json. ` +
            'Refusing to publish it. Re-run `npm run site:release` from the real build.',
        )
      }

      const target = join(OUT_DIR, release.download)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, bytes)
      console.log(`[site] ${release.download}: ${(bytes.length / 1e6).toFixed(1)} MB, sha256 verified`)
    },
  }
}

/**
 * The page's Content-Security-Policy (vercel.json) allows inline script
 * only by hash. Fails the build if an inline `<script>` in the built page
 * has a hash that policy does not list — otherwise editing that one line
 * would silently stop it running in production.
 */
function checkCspHashes(): Plugin {
  return {
    name: 'afrocoils:check-csp',
    apply: 'build',
    closeBundle() {
      const html = readFileSync(join(OUT_DIR, 'index.html'), 'utf8')
      const vercel = readFileSync(fileURLToPath(new URL('./vercel.json', import.meta.url)), 'utf8')
      for (const [, body] of html.matchAll(/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)) {
        // Hashed as the browser hashes it: the HTML parser turns CRLF into
        // LF first, so a Windows checkout and Vercel's agree.
        const text = body.replace(/\r\n?/g, '\n')
        const hash = `'sha256-${createHash('sha256').update(text).digest('base64')}'`
        if (!vercel.includes(hash)) {
          throw new Error(`An inline <script> in site/index.html is not allowed by the CSP in vercel.json. Add ${hash} to script-src.`)
        }
      }
    },
  }
}

export default defineConfig({
  root: site(''),
  base: './',
  plugins: [founder(), siteFacts(), requireReleaseFile(), serveApk(), checkCspHashes()],
  css: {
    postcss: {
      plugins: [tailwindcss({ config: site('tailwind.config.js') }), autoprefixer()],
    },
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    rollupOptions: { input: PAGES.map((page) => site(page.file)) },
  },
  server: {
    port: 5174,
    // The page imports the brand artwork from src/assets, outside its root.
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url))] },
  },
})
