/**
 * The kill switch: retire every installed copy below a given version.
 *
 *   npm run release:floor                          # show the floor, change nothing
 *   npm run release:floor -- --bundle 11           # retire copies below pushed update 11
 *   npm run release:floor -- --apk 11              # retire APKs below versionCode 11
 *   npm run release:floor -- --bundle 12 --apk 11  # both
 *   npm run release:floor -- --clear               # lift it
 *   … --dry-run                                    # print what would be published
 *
 * Writes `floor` into site/release.json and republishes latest.json
 * (`ReleaseFloor` in src/lib/types.ts). No build, no deploy: phones hear
 * it on their next update check (six-hourly at most) or membership check
 * (twelve-hourly, and on every sign-in), whichever comes first — the
 * server repeats latest.json's floor within five minutes. A retired copy
 * shows one screen offering the update and nothing else, until it is at
 * or above the floor or the floor is lifted.
 *
 * A flag left out keeps that half as it is, so `--bundle 12` alone does
 * not lift an APK floor set earlier.
 *
 * **What it cannot do.** Only copies that carry the switch obey it:
 * pushed update 11 onward, and APK 11 onward. An older copy never looks.
 *
 * It refuses a floor above what is published, because a version nobody
 * can update to would lock every phone with no way out. So the order is
 * always: publish the update, then raise the floor to it.
 */
import { clampFloor, publishManifest, readRelease, writeRelease } from './lib/release-manifest.mjs'

const args = process.argv.slice(2)
const has = (name) => args.includes(`--${name}`)
const value = (name) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}

function fail(message) {
  console.error(`[floor] ${message}`)
  process.exit(1)
}

const describe = (floor) =>
  floor
    ? [
        floor.bundle ? `pushed updates below ${floor.bundle}` : null,
        floor.versionCode ? `APKs below build ${floor.versionCode}` : null,
      ]
        .filter(Boolean)
        .join(' and ') + ' are retired'
    : 'nothing is retired'

const release = readRelease()
const current = clampFloor(release.floor, release)
const published = `Published now: APK build ${release.versionCode}, pushed update ${release.bundle?.code ?? 0}.`

if (!has('clear') && value('bundle') === undefined && value('apk') === undefined) {
  console.log(`[floor] ${describe(current)}.`)
  console.log(`[floor] ${published}`)
  process.exit(0)
}

function number(name, ceiling, what) {
  const raw = value(name)
  if (raw === undefined) return undefined
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) fail(`--${name} takes a whole number, got "${raw}".`)
  if (n > ceiling) {
    fail(
      `--${name} ${n} is above the newest ${what} published (${ceiling}). No phone could update past it, ` +
        'so every copy would be locked. Publish the update first, then raise the floor.',
    )
  }
  return n
}

let next
if (has('clear')) {
  if (value('bundle') !== undefined || value('apk') !== undefined) fail('--clear lifts the whole floor; leave --bundle and --apk out.')
  next = undefined
} else {
  next = clampFloor(
    {
      bundle: number('bundle', Number(release.bundle?.code) || 0, 'pushed update') ?? current?.bundle ?? 0,
      versionCode: number('apk', Number(release.versionCode) || 0, 'APK') ?? current?.versionCode ?? 0,
    },
    release,
  )
}

console.log(`[floor] was: ${describe(current)}.`)
console.log(`[floor] now: ${describe(next)}.`)
console.log(`[floor] ${published}`)
if (next?.bundle === (Number(release.bundle?.code) || 0) && next.bundle > 0) {
  console.log('[floor] Every copy not on the newest pushed update will stop until it updates.')
}

if (has('dry-run')) {
  console.log('[floor] dry run: nothing written, nothing published.')
  process.exit(0)
}

const { floor: _old, ...rest } = release
const updated = next ? { ...rest, floor: next } : rest
writeRelease(updated)
publishManifest(updated)
console.log('[floor] published. Commit site/release.json so the next release keeps it.')
