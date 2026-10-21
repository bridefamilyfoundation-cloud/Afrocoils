/**
 * Builds the one APK, at `apk-output/afrocoil.apk`.
 *
 *   npm run apk
 *
 * Every APK this produces installs over the app already on a phone,
 * because the three things Android checks are held fixed or forced
 * upward here rather than left to whoever runs the build:
 *
 * - **Package id**: `com.afrocoilyhair.app`, from build.gradle. A
 *   different id is a second app, not an update.
 * - **Signature**: the build must be signed by the certificate pinned
 *   below, the one every installed copy carries. A different key and
 *   Android refuses the install outright; the only way past it is
 *   uninstalling, which deletes the user's profile. The script checks
 *   the built file with `apksigner` rather than trusting
 *   keystore.properties, because a missing or edited properties file
 *   produces an unsigned or differently signed APK without an error.
 * - **versionCode**: raised past everything already built or published
 *   (`gradle.properties`, `site/release.json`, the last APK in
 *   `apk-output/`) before every build, so it only goes up. Android
 *   refuses a lower code as a downgrade. Gaps left by failed builds are
 *   harmless; only the order matters.
 *
 * The folder holds one APK under one name. Anything else ending in
 * `.apk` in it is removed, so there is never a question of which file
 * is current. `site:release` still publishes from the Gradle output.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANIFEST_URL } from './lib/release-manifest.mjs'

/**
 * SHA-256 of the signing certificate on every APK shipped so far
 * (CN=Afro Coily Hair Dev, android/afro-coily-dev.keystore). A
 * certificate fingerprint is public — it is printed by anyone who runs
 * `apksigner verify --print-certs` on the download — so it is safe to
 * commit. Changing it means every installed copy stops updating.
 */
const PINNED_CERT_SHA256 = '6b782be2da262dfb4dadf8ff02d2de9d82b4d5f561ef0a0176578abcd215466e'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const at = (...parts) => join(ROOT, ...parts)
const OUT_DIR = at('apk-output')
const OUT_APK = join(OUT_DIR, 'afrocoil.apk')
const GRADLE_PROPS = at('android/gradle.properties')
const BUILT_APK = at('android/app/build/outputs/apk/release/app-release.apk')
const BUILT_META = at('android/app/build/outputs/apk/release/output-metadata.json')
const windows = process.platform === 'win32'

function fail(message) {
  console.error(`[apk] ${message}`)
  process.exit(1)
}

/**
 * Windows runs `.bat` and `.cmd` files only through the shell, and the
 * project path has a space in it, so anything that is a path is quoted.
 */
const q = (arg) => (windows && /[\s]/.test(arg) ? `"${arg}"` : arg)

function run(command, args, cwd = ROOT) {
  const result = spawnSync(q(command), args.map(q), { cwd, stdio: 'inherit', shell: windows })
  if (result.status !== 0) fail(`\`${command} ${args.join(' ')}\` failed.`)
}

/** `apksigner` from the newest build-tools in the SDK local.properties names. */
function findApksigner() {
  const fromProps = /^sdk\.dir=(.*)$/m
    .exec(readFileSync(at('android/local.properties'), 'utf8').replace(/^﻿/, ''))?.[1]
    ?.replace(/\\\\/g, '\\')
    .replace(/\\:/g, ':')
  const sdk = fromProps ?? process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT
  if (!sdk) fail('Cannot find the Android SDK: set sdk.dir in android/local.properties or ANDROID_HOME.')
  const tools = join(sdk, 'build-tools')
  const newest = readdirSync(tools)
    .filter((v) => /^\d+(\.\d+)*$/.test(v))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0]
  if (!newest) fail(`No build-tools under ${tools}.`)
  return join(tools, newest, windows ? 'apksigner.bat' : 'apksigner')
}

/** The signer's certificate digest, or undefined if unsigned. */
function signerOf(apk, apksigner) {
  const result = spawnSync(q(apksigner), ['verify', '--print-certs', q(apk)], {
    encoding: 'utf8',
    shell: windows,
  })
  return /certificate SHA-256 digest: ([0-9a-f]{64})/.exec(result.stdout)?.[1]
}

/** The versionCode inside an APK Gradle built, via the metadata beside it. */
function builtVersionCode() {
  return JSON.parse(readFileSync(BUILT_META, 'utf8')).elements[0].versionCode
}

/* 1. Signing has to be configured, or Gradle quietly builds unsigned. */
if (!existsSync(at('android/keystore.properties'))) {
  fail(
    'android/keystore.properties is missing, so the APK would be unsigned and Android would refuse it.\n' +
      '      Restore it (and android/afro-coily-dev.keystore) from your backup. A new key will NOT do:\n' +
      '      installed copies only accept updates signed by the original one.',
  )
}

/* 1b. The backend and the update manifest are compiled in. An APK built
   without the manifest URL can never hear of a pushed update — it would
   need a reinstall to get one, which is the thing pushes exist to avoid. */
{
  const env = existsSync(at('.env.production')) ? readFileSync(at('.env.production'), 'utf8') : ''
  const manifest = /^VITE_UPDATE_MANIFEST_URL=(.*)$/m.exec(env)?.[1]?.trim()
  if (manifest !== MANIFEST_URL) {
    fail(`.env.production must set VITE_UPDATE_MANIFEST_URL=${MANIFEST_URL} (found ${manifest || 'nothing'}).`)
  }
  if (!/^VITE_API_BASE_URL=https:\/\//m.test(env)) {
    fail('.env.production must set VITE_API_BASE_URL to the deployed functions URL (https://…/functions/v1).')
  }
}

/* 2. The next versionCode: above everything that already exists. */
const props = readFileSync(GRADLE_PROPS, 'utf8')
const current = Number(/^appVersionCode=(\d+)/m.exec(props)?.[1] ?? 0)
const published = existsSync(at('site/release.json'))
  ? Number(JSON.parse(readFileSync(at('site/release.json'), 'utf8')).versionCode ?? 0)
  : 0
const lastOutput = existsSync(join(OUT_DIR, 'afrocoil.json'))
  ? Number(JSON.parse(readFileSync(join(OUT_DIR, 'afrocoil.json'), 'utf8')).versionCode ?? 0)
  : 0
const next = Math.max(current, published, lastOutput) + 1

writeFileSync(
  GRADLE_PROPS,
  /^appVersionCode=\d+/m.test(props)
    ? props.replace(/^appVersionCode=\d+/m, `appVersionCode=${next}`)
    : `${props.trimEnd()}\nappVersionCode=${next}\n`,
)
console.log(`[apk] versionCode ${current} -> ${next}`)

/* 3. Build: web bundle, Capacitor sync, signed release APK. */
run('npm', ['run', 'cap:sync'])
run(at('android', windows ? 'gradlew.bat' : 'gradlew'), ['assembleRelease'], at('android'))

/* 4. Check what was built, not what was asked for. */
if (!existsSync(BUILT_APK)) fail(`Gradle finished but there is no APK at ${BUILT_APK}.`)
if (builtVersionCode() !== next) {
  fail(`The APK was built as versionCode ${builtVersionCode()}, expected ${next}.`)
}
const signer = signerOf(BUILT_APK, findApksigner())
if (!signer) fail('The APK is unsigned. Check android/keystore.properties.')
if (signer !== PINNED_CERT_SHA256) {
  fail(
    `The APK is signed by a different key (${signer}).\n` +
      `      Installed copies are signed by ${PINNED_CERT_SHA256} and will refuse it.\n` +
      '      Point android/keystore.properties back at the original keystore.',
  )
}

/* 5. One APK, one name. */
mkdirSync(OUT_DIR, { recursive: true })
for (const file of readdirSync(OUT_DIR)) {
  if (file.endsWith('.apk')) rmSync(join(OUT_DIR, file))
}
copyFileSync(BUILT_APK, OUT_APK)

const { version } = JSON.parse(readFileSync(at('package.json'), 'utf8'))
const sha256 = createHash('sha256').update(readFileSync(OUT_APK)).digest('hex')
// Beside the APK so the next build knows the last code even if
// gradle.properties was reverted, and so a person can see what the file is.
writeFileSync(
  join(OUT_DIR, 'afrocoil.json'),
  JSON.stringify(
    {
      version,
      versionCode: next,
      // The pushed update baked into this APK (vite.config.ts read it from
      // site/release.json). site:release refuses the APK if a newer push
      // has gone out since, because those users would be offered an
      // older bundle than the one in their APK.
      bundleCode: Number(JSON.parse(readFileSync(at('site/release.json'), 'utf8')).bundle?.code) || 0,
      sha256,
      signer,
      built: new Date().toISOString(),
    },
    null,
    2,
  ) + '\n',
)

console.log(`[apk] ${OUT_APK}`)
console.log(`[apk] AfroCoils ${version} (versionCode ${next}) · signed ${signer.slice(0, 12)}… · sha256 ${sha256.slice(0, 12)}…`)
