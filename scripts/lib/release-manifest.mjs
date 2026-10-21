/**
 * Where releases live, and how they get there.
 *
 * Everything an installed copy or the landing site downloads is in one
 * public Supabase Storage bucket, `releases` (migration 0002):
 *
 *   releases/latest.json                 what every installed copy reads
 *   releases/apk/AfroCoils-<v>-<code>.apk   the download button's target
 *   releases/bundles/<code>.zip          pushed updates
 *
 * Uploads go through the Supabase CLI under the developer's own login
 * (`npx supabase login`), not a service key in an env file: the bucket
 * accepts writes only from the service role, and whoever can write a
 * bundle here can put code on every installed phone, so that key stays
 * out of this machine's files entirely.
 *
 * site/release.json is the record of what is published. Both
 * `site:release` (a new APK) and `ota:publish` (a pushed update) update
 * it and then call `publishManifest`, so latest.json is always written
 * from the same file the landing site's download card is built from.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const at = (...parts) => join(ROOT, ...parts)

/** The project's ref. Public — it is the hostname of every URL below. */
export const PROJECT_REF = 'runhkccoeyxfgsfrzezn'
export const BUCKET = 'releases'

/** The landing site, for the manifest's link to the checksum and install steps. */
export const SITE_URL = 'https://afrocoils.vercel.app/'

export const publicUrl = (path) =>
  `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/${BUCKET}/${path}`

/** What `VITE_UPDATE_MANIFEST_URL` must be for a release build. */
export const MANIFEST_URL = publicUrl('latest.json')

const RELEASE_PATH = at('site/release.json')

export function readRelease() {
  return JSON.parse(readFileSync(RELEASE_PATH, 'utf8'))
}

export function writeRelease(release) {
  writeFileSync(RELEASE_PATH, `${JSON.stringify(release, null, 2)}\n`)
}

/**
 * `latest.json` from `site/release.json`: the `UpdateManifest` contract
 * in src/lib/types.ts. Absolute URLs, because the manifest is served
 * from the bucket and the landing page is elsewhere.
 */
export function manifestFrom(release) {
  const { packageId: _packageId, ...rest } = release
  return { ...rest, page: `${SITE_URL}#download` }
}

/** The day, local to this machine, as `YYYY-MM-DD` — never toISOString(), which is UTC. */
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function fail(message) {
  console.error(`[release] ${message}`)
  process.exit(1)
}

/**
 * Upload one file to the bucket with the project's pinned CLI.
 *
 * `cacheControl` matters for latest.json: the storage CDN honours it,
 * and the app's check must see a push within minutes, not the default
 * hour. Immutable paths (a numbered zip, a versioned APK) cache for a year.
 */
export function upload(localPath, remotePath, { contentType, cacheControl }) {
  const windows = process.platform === 'win32'
  const q = (arg) => (windows && /\s/.test(arg) ? `"${arg}"` : arg)
  const args = [
    'supabase',
    'storage',
    'cp',
    // Relative, forward slashes: the CLI parses its arguments as URLs,
    // and `C:\…` reads as a URL with the scheme "c".
    relative(ROOT, localPath).split('\\').join('/'),
    `ss:///${BUCKET}/${remotePath}`,
    '--experimental',
    '--linked',
    '--content-type',
    contentType,
    '--cache-control',
    cacheControl,
  ]
  const result = spawnSync('npx', args.map(q), { cwd: ROOT, stdio: 'inherit', shell: windows })
  if (result.status !== 0) {
    fail(
      `Upload of ${remotePath} failed. Is the CLI logged in to the account that owns ${PROJECT_REF}? ` +
        '(`npx supabase login`, then `npx supabase link --project-ref ' + PROJECT_REF + '`)',
    )
  }
}

/** Write latest.json from site/release.json and upload it. */
export function publishManifest(release) {
  // Staged inside the project (apk-output/ is gitignored) so the CLI gets a plain relative path.
  mkdirSync(at('apk-output'), { recursive: true })
  const file = at('apk-output', 'latest.json')
  writeFileSync(file, `${JSON.stringify(manifestFrom(release), null, 2)}\n`)
  upload(file, 'latest.json', { contentType: 'application/json', cacheControl: 'max-age=60' })
  console.log(`[release] latest.json → ${MANIFEST_URL}`)
}
