/**
 * Pushes an update to every installed copy, without a new APK.
 *
 *   npm run ota:publish -- --note "New loc styles" --note "Fixes the quiz"
 *   npm run ota:publish -- --dry-run      # build and zip, upload nothing
 *
 * Builds the web app, zips `dist/`, uploads it to the `releases` bucket
 * as `bundles/<code>.zip`, records it in site/release.json and rewrites
 * latest.json. The next time an installed copy checks (on open, at most
 * six-hourly), it shows "An update is ready"; one tap downloads it, the
 * updater verifies the SHA-256 written here, and the app restarts into
 * it. The APK's versionCode, package id and signature do not change.
 *
 * **What a push can carry:** anything under `src/` — screens, copy,
 * content, styles, images. **What it cannot:** a new or upgraded
 * Capacitor plugin, a permission, the icon or splash, anything in
 * `android/` or `capacitor.config.ts`. Those need `npm run apk` and
 * `npm run site:release`. A bundle that calls a plugin its APK does not
 * have breaks on that call, which is what `minVersionCode` guards: each
 * bundle names the APK published when it was built, and is never offered
 * to an older one.
 *
 * The bundle is built with the same .env.production as the APK, so it
 * points at the same backend and the same manifest.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { zipSync } from 'fflate'
import { MANIFEST_URL, at, localDay, publicUrl, publishManifest, readRelease, upload, writeRelease } from './lib/release-manifest.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const notes = args.flatMap((arg, i) => (arg === '--note' && args[i + 1] ? [args[i + 1]] : []))

function fail(message) {
  console.error(`[ota] ${message}`)
  process.exit(1)
}

/* A bundle that checks a different manifest, or none, would strand
   every phone that installs it: it could never hear of the next push. */
const envFile = at('.env.production')
const env = existsSync(envFile) ? readFileSync(envFile, 'utf8') : ''
const manifestUrl = /^VITE_UPDATE_MANIFEST_URL=(.*)$/m.exec(env)?.[1]?.trim()
if (manifestUrl !== MANIFEST_URL) {
  fail(`.env.production must set VITE_UPDATE_MANIFEST_URL=${MANIFEST_URL} (found ${manifestUrl || 'nothing'}).`)
}
if (!/^VITE_API_BASE_URL=https:\/\//m.test(env)) {
  fail('.env.production must set VITE_API_BASE_URL to the deployed functions URL.')
}

const release = readRelease()
const code = (release.bundle?.code ?? 0) + 1

/* Build with the new code baked in, so the bundle knows which push it is. */
const windows = process.platform === 'win32'
const built = spawnSync('npm', ['run', 'build'], {
  cwd: at(),
  stdio: 'inherit',
  shell: windows,
  env: { ...process.env, VITE_BUNDLE_CODE: String(code) },
})
if (built.status !== 0) fail('`npm run build` failed; nothing was published.')

/* Zip dist/ with index.html at the root, which is the layout the updater unpacks. */
const dist = at('dist')
const files = {}
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else files[relative(dist, path).split('\\').join('/')] = readFileSync(path)
  }
}
walk(dist)
if (!files['index.html']) fail('dist/index.html is missing; the build did not produce an app.')

// Fixed timestamps, so the same build zips to the same bytes.
const zip = zipSync(files, { level: 9, mtime: new Date(2000, 0, 1) })
const sha256 = createHash('sha256').update(zip).digest('hex')
mkdirSync(at('apk-output'), { recursive: true })
const zipPath = at('apk-output', `bundle-${code}.zip`)
writeFileSync(zipPath, zip)

const bundle = {
  code,
  // The APK published now. Its plugins are the ones this source was built against.
  minVersionCode: release.versionCode,
  bytes: zip.length,
  sha256,
  released: localDay(),
  url: publicUrl(`bundles/${code}.zip`),
  notes,
}

console.log(`[ota] update ${code} · ${(zip.length / 1e6).toFixed(1)} MB · ${Object.keys(files).length} files · for build ${release.versionCode}+`)
console.log(`[ota] sha256 ${sha256}`)

if (dryRun) {
  console.log(`[ota] dry run: zip at ${zipPath}; nothing uploaded, release.json unchanged.`)
  process.exit(0)
}

// The zip first, then the manifest that points at it: a phone must
// never be told about a file that is not there yet.
upload(zipPath, `bundles/${code}.zip`, { contentType: 'application/zip', cacheControl: 'max-age=31536000, immutable' })
const next = { ...release, bundle }
writeRelease(next)
publishManifest(next)
console.log(`[ota] pushed. Commit site/release.json so the next APK build starts from update ${code}.`)
