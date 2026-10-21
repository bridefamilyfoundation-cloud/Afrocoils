/**
 * Publishes a release APK: to the `releases` bucket, to latest.json, and
 * to the landing site's download card.
 *
 *   npm run apk            # build it first — the only way to make one
 *   npm run site:release -- --note "Faster wash-day calendar" --note "Fixes the quiz"
 *   npm run site:release -- --apk path/to/other.apk --url https://host/AfroCoils.apk
 *
 * Uploads the APK to `releases/apk/`, writes `site/release.json` — every
 * fact the download card states — and rewrites latest.json, so installed
 * copies are offered it on their next check. Commit release.json and
 * redeploy the landing site so its download button follows.
 *
 * A new APK is only needed for native changes (a plugin, a permission,
 * the icon). Screens and content go out with `npm run ota:publish`
 * instead, which leaves the APK's version alone.
 *
 * Nothing on the card is typed by hand. Version, build number, package id
 * and minimum Android are read from the build, and size and SHA-256 from
 * the file itself, because a checksum that was pasted in is a checksum
 * that eventually describes a different file. The script also refuses an
 * APK whose metadata disagrees with the project, or one that is unsigned:
 * Android will not install an unsigned APK, so publishing one is a dead
 * download button with a correct-looking checksum beside it.
 *
 * `--url` points the button at a file hosted elsewhere instead of
 * uploading it. The APK is still read locally, so the size and checksum
 * are of the file being linked.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { at, localDay, publicUrl, publishManifest, readRelease, upload, writeRelease } from './lib/release-manifest.mjs'

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

const apkPath = resolve(flag('apk') ?? at('apk-output/afrocoil.apk'))
if (!existsSync(apkPath)) fail(`No APK at ${apkPath}. Run \`npm run apk\` first.`)

/* What the build says it is. */
const { version } = JSON.parse(readFileSync(at('package.json'), 'utf8'))
const versionCode = Number(/^appVersionCode=(\d+)/m.exec(readFileSync(at('android/gradle.properties'), 'utf8'))?.[1])
const minSdk = Number(/minSdkVersion\s*=\s*(\d+)/.exec(readFileSync(at('android/variables.gradle'), 'utf8'))?.[1])
const packageId = /applicationId\s+"([^"]+)"/.exec(readFileSync(at('android/app/build.gradle'), 'utf8'))?.[1]
if (!versionCode || !minSdk || !packageId) fail('Could not read versionCode, minSdk or applicationId from the Gradle files.')

const bytes = readFileSync(apkPath)
// v2+ signatures live in the APK Signing Block, whose magic is this string.
if (!bytes.includes(Buffer.from('APK Sig Block 42'))) {
  fail('The APK is unsigned, and Android will not install it. Check android/keystore.properties.')
}
const sha256 = createHash('sha256').update(bytes).digest('hex')

const previous = existsSync(at('site/release.json')) ? readRelease() : undefined

/* `npm run apk` writes what it built beside the file. A stale APK from
   before a version bump is the likeliest way for this card to lie. */
const metaPath = join(dirname(apkPath), 'afrocoil.json')
if (existsSync(metaPath)) {
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  if (meta.sha256 === sha256) {
    if (meta.version !== version || meta.versionCode !== versionCode) {
      fail(
        `The APK was built as ${meta.version} (${meta.versionCode}), but the project is ${version} (${versionCode}). ` +
          'Rebuild with `npm run apk`.',
      )
    }
    /* An APK carries the pushed update that was current when it was
       built. If a newer one went out since, its users would be offered
       that update over the APK's own — fine — but an APK built *before*
       a push and published after it would ship older screens than the
       phones it replaces. Rebuilding picks the push up. */
    const pushed = Number(previous?.bundle?.code) || 0
    if ((Number(meta.bundleCode) || 0) < pushed) {
      fail(`This APK was built before update ${pushed} was pushed, so it carries older screens. Rebuild with \`npm run apk\`.`)
    }
  }
}

/* Android version names for the API levels this project could target. */
const ANDROID = { 21: '5.0', 22: '5.1', 23: '6.0', 24: '7.0', 25: '7.1', 26: '8.0', 27: '8.1', 28: '9', 29: '10', 30: '11', 31: '12', 32: '12L', 33: '13', 34: '14', 35: '15', 36: '16' }
if (!ANDROID[minSdk]) fail(`No Android version name recorded for API ${minSdk} — add it to the table in this script.`)

/*
 * Installed apps learn about this release from latest.json, and Android
 * installs a download *over* the existing app only if its versionCode is
 * higher. Publishing a different APK under the same or a lower number
 * would put an update prompt in front of every user for a file their
 * phone then refuses with "App not installed". Re-running for the same
 * file is fine.
 */
if (previous && previous.sha256 !== sha256 && !(versionCode > previous.versionCode)) {
  fail(
    `This APK is build ${versionCode}, but build ${previous.versionCode} is already published. ` +
      'Rebuild with `npm run apk`, which raises it, or installed copies cannot update to it.',
  )
}

/* What's new, for the update prompt. Carried over on a re-run of the
   same file unless new notes are given. */
const given = flags('note')
const notes = given.length > 0 ? given : previous?.sha256 === sha256 ? (previous.notes ?? []) : []

/* Versioned by build, so a published URL always names one file and can
   be cached for good. */
const remote = `apk/AfroCoils-${version}-${versionCode}.apk`
const url = flag('url') ?? publicUrl(remote)

const release = {
  version,
  versionCode,
  packageId,
  minSdk,
  minAndroid: ANDROID[minSdk],
  bytes: bytes.length,
  sha256,
  // The build's local calendar day, from the file's own timestamp.
  released: localDay(statSync(apkPath).mtime),
  url,
  notes,
  // Pushed updates carry on from where they were; the next one is built
  // against this APK (ota:publish sets minVersionCode from versionCode).
  ...(previous?.bundle ? { bundle: previous.bundle } : {}),
}

if (!flag('url')) {
  upload(apkPath, remote, {
    contentType: 'application/vnd.android.package-archive',
    cacheControl: 'max-age=31536000, immutable',
  })
}
writeRelease(release)
publishManifest(release)

console.log(`[site:release] ${packageId} ${version} (${versionCode}) · ${(release.bytes / 1e6).toFixed(1)} MB · Android ${release.minAndroid}+`)
console.log(`[site:release] sha256 ${release.sha256}`)
console.log(`[site:release] download: ${url}`)
console.log('[site:release] Commit site/release.json and redeploy the landing site so its button follows.')
