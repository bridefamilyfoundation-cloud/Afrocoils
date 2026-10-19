/**
 * Publishes a release APK to the landing site.
 *
 *   npm run android:release   # build it first
 *   npm run site:release      # then this
 *   npm run site:release -- --apk path/to/other.apk --url https://host/afrocoil.apk
 *   npm run site:release -- --note "Faster wash-day calendar" --note "Fixes the quiz"
 *
 * Writes `site/release.json` — every fact the download card states — and
 * copies the APK to `site/public/download/`, where the site serves it.
 *
 * Nothing on that card is typed by hand. Version, build number, package id
 * and minimum Android are read from the build, and size and SHA-256 from
 * the file itself, because a checksum that was pasted in is a checksum
 * that eventually describes a different file. The script also refuses an
 * APK whose metadata disagrees with package.json, or one that is unsigned:
 * Android will not install an unsigned APK, so publishing one is a dead
 * download button with a correct-looking checksum beside it.
 *
 * `--url` points the button at a file hosted elsewhere (a GitHub release
 * asset, say) instead of copying it into the site. The APK is still read
 * locally, so the size and checksum are of the file being linked.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const at = (...parts) => join(ROOT, ...parts)

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}
/** Every value of a repeatable flag: `--note "Faster" --note "Fixes"`. */
const flags = (name) => args.flatMap((arg, i) => (arg === `--${name}` && args[i + 1] ? [args[i + 1]] : []))

function fail(message) {
  console.error(`[site:release] ${message}`)
  process.exit(1)
}

const RELEASE_DIR = at('android/app/build/outputs/apk/release')
const apkPath = resolve(flag('apk') ?? join(RELEASE_DIR, 'app-release.apk'))
if (!existsSync(apkPath)) fail(`No APK at ${apkPath}. Run \`npm run android:release\` first.`)

/* What the build says it is. */
const { version } = JSON.parse(readFileSync(at('package.json'), 'utf8'))
const versionCode = Number(/^appVersionCode=(\d+)/m.exec(readFileSync(at('android/gradle.properties'), 'utf8'))?.[1])
const minSdk = Number(/minSdkVersion\s*=\s*(\d+)/.exec(readFileSync(at('android/variables.gradle'), 'utf8'))?.[1])
const packageId = /applicationId\s+"([^"]+)"/.exec(readFileSync(at('android/app/build.gradle'), 'utf8'))?.[1]
if (!versionCode || !minSdk || !packageId) fail('Could not read versionCode, minSdk or applicationId from the Gradle files.')

/* Cross-check against the metadata Gradle wrote beside the APK, when it
   is the default build output. A stale APK from before a version bump is
   the likeliest way for this card to lie. */
if (!flag('apk')) {
  const meta = JSON.parse(readFileSync(join(RELEASE_DIR, 'output-metadata.json'), 'utf8'))
  const built = meta.elements?.[0] ?? {}
  if (meta.applicationId !== packageId || built.versionName !== version || built.versionCode !== versionCode) {
    fail(
      `The APK was built as ${meta.applicationId} ${built.versionName} (${built.versionCode}), ` +
        `but the project is ${packageId} ${version} (${versionCode}). Rebuild with \`npm run android:release\`.`,
    )
  }
}

const bytes = readFileSync(apkPath)
// v2+ signatures live in the APK Signing Block, whose magic is this string.
if (!bytes.includes(Buffer.from('APK Sig Block 42'))) {
  fail('The APK is unsigned, and Android will not install it. Check android/keystore.properties.')
}

/* Android version names for the API levels this project could target. */
const ANDROID = { 21: '5.0', 22: '5.1', 23: '6.0', 24: '7.0', 25: '7.1', 26: '8.0', 27: '8.1', 28: '9', 29: '10', 30: '11', 31: '12', 32: '12L', 33: '13', 34: '14', 35: '15', 36: '16' }
if (!ANDROID[minSdk]) fail(`No Android version name recorded for API ${minSdk} — add it to the table in this script.`)

const file = `afrocoil-${version}.apk`
const url = flag('url')
const mtime = statSync(apkPath).mtime
// The build's local calendar day, as a YYYY-MM-DD key — not toISOString(),
// which is the UTC day and is yesterday for an evening build west of Greenwich.
const released = `${mtime.getFullYear()}-${String(mtime.getMonth() + 1).padStart(2, '0')}-${String(mtime.getDate()).padStart(2, '0')}`

const sha256 = createHash('sha256').update(bytes).digest('hex')

/*
 * Installed apps learn about this release from latest.json (written from
 * this file by the site build), and Android installs a download *over*
 * the existing app only if its versionCode is higher. Publishing a
 * different APK under the same or a lower number would put an update
 * prompt in front of every user for a file their phone then refuses with
 * "App not installed". Re-running for the same file is fine.
 */
const releasePath = at('site/release.json')
const previous = existsSync(releasePath) ? JSON.parse(readFileSync(releasePath, 'utf8')) : undefined
if (previous && previous.sha256 !== sha256 && !(versionCode > previous.versionCode)) {
  fail(
    `This APK is build ${versionCode}, but build ${previous.versionCode} is already published. ` +
      'Bump appVersionCode in android/gradle.properties and rebuild, or installed copies cannot update to it.',
  )
}

/* What's new, for the update prompt. Carried over on a re-run of the
   same file unless new notes are given. */
const given = flags('note')
const notes = given.length > 0 ? given : previous?.sha256 === sha256 ? (previous.notes ?? []) : []

const release = {
  version,
  versionCode,
  packageId,
  minSdk,
  minAndroid: ANDROID[minSdk],
  bytes: bytes.length,
  sha256,
  released,
  url: url ?? `download/${file}`,
  notes,
}

/* Only the current APK is served; older ones are removed so the folder
   never holds a file the card does not describe. */
const downloads = at('site/public/download')
mkdirSync(downloads, { recursive: true })
for (const old of readdirSync(downloads)) if (old.endsWith('.apk')) rmSync(join(downloads, old))
if (!url) copyFileSync(apkPath, join(downloads, file))

writeFileSync(releasePath, `${JSON.stringify(release, null, 2)}\n`)
console.log(`[site:release] ${packageId} ${version} (${versionCode}) · ${(release.bytes / 1e6).toFixed(1)} MB · Android ${release.minAndroid}+`)
console.log(`[site:release] sha256 ${release.sha256}`)
console.log(`[site:release] ${url ? `linked to ${url}` : `copied to site/public/download/${file}`}`)
