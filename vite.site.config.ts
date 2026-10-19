import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { defineConfig, type Plugin } from 'vite'
import { GUIDES } from './src/content/guides'
import { HAIR_CHECK } from './src/content/hair-check'
import { LOC_CARE } from './src/content/loc-care'
import { STYLES } from './src/content/styles'
import { TIME_BANDS, type UpdateManifest } from './src/lib/types'

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

/** site/release.json: the manifest's fields, less the page link, plus the package id. */
type Release = Omit<UpdateManifest, 'page'> & { packageId: string }

function readRelease(): Release {
  const path = site('release.json')
  if (!existsSync(path)) {
    throw new Error('site/release.json is missing. Run `npm run android:release && npm run site:release`.')
  }
  const release = JSON.parse(readFileSync(path, 'utf8')) as Release
  // Written before release notes existed.
  return { ...release, notes: release.notes ?? [] }
}

/**
 * `latest.json` — what installed copies of the app read to learn that a
 * newer build is out (src/lib/updates.ts). Served beside index.html, so
 * the relative `url` and `page` resolve against it on any host.
 */
function updateManifest(): UpdateManifest {
  const { packageId: _packageId, ...release } = readRelease()
  return { ...release, page: './#download' }
}

/** `YYYY-MM-DD` → "12 September 2026", in local time (never Date.parse). */
function longDate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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

  const tokens: Record<string, string> = {
    'release.version': release.version,
    'release.versionCode': String(release.versionCode),
    'release.packageId': release.packageId,
    'release.minAndroid': release.minAndroid,
    'release.size': `${(release.bytes / 1e6).toFixed(1)} MB`,
    'release.sha256': release.sha256,
    'release.released': longDate(release.released),
    'release.releasedKey': release.released,
    'release.url': release.url,
    'count.styles': String(STYLES.length),
    'count.guides': String(GUIDES.length),
    'count.concerns': String(HAIR_CHECK.reduce((n, group) => n + group.concerns.length, 0)),
    'count.locChapters': String(LOC_CARE.length),
    'band.first.label': bands[0].label,
    'band.first.count': String(STYLES.filter((s) => s.minutes <= TIME_BANDS[0].max).length),
    'bands.labels': TIME_BANDS.map((b) => b.label.replace(' min', '')).join(', ').replace(/, ([^,]*)$/, ' or $1'),
    'locs.chapters': LOC_CARE.map(
      (c) => `<li class="rounded-full bg-white/10 px-3 py-1 font-caption text-caption">${escapeHtml(c.title)}</li>`,
    ).join(''),
  }

  return { release, bands, tokens }
}

function siteFacts(): Plugin {
  const VIRTUAL = 'virtual:site-facts'
  return {
    name: 'afrocoil:site-facts',
    resolveId: (id) => (id === VIRTUAL ? `\0${VIRTUAL}` : undefined),
    load(id) {
      if (id !== `\0${VIRTUAL}`) return
      const { release, bands } = facts()
      return `export const release = ${JSON.stringify(release)}\nexport const bands = ${JSON.stringify(bands)}\n`
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

/** Publishes `latest.json` in the build, and serves it from `site:dev`. */
function publishUpdateManifest(): Plugin {
  return {
    name: 'afrocoil:update-manifest',
    configureServer(server) {
      server.middlewares.use('/latest.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(JSON.stringify(updateManifest(), null, 2))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'latest.json', source: `${JSON.stringify(updateManifest(), null, 2)}\n` })
    },
  }
}

/** Fails the build if the download button would point at nothing. */
function requireReleaseFile(): Plugin {
  return {
    name: 'afrocoil:require-release-file',
    apply: 'build',
    buildStart() {
      const { url } = readRelease()
      if (/^https?:\/\//.test(url)) return
      if (!existsSync(site(`public/${url}`))) {
        this.error(
          `site/release.json points at ${url}, which is not in site/public/. ` +
            'Run `npm run android:release && npm run site:release` before building the site.',
        )
      }
    },
  }
}

export default defineConfig({
  root: site(''),
  base: './',
  plugins: [siteFacts(), publishUpdateManifest(), requireReleaseFile()],
  css: {
    postcss: {
      plugins: [tailwindcss({ config: site('tailwind.config.js') }), autoprefixer()],
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist-site', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    // The page imports the brand artwork from src/assets, outside its root.
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url))] },
  },
})
