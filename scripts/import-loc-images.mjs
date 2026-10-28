/**
 * Cuts the generated loc sheets into the lookbook's angle slots.
 *
 * The source is `Locs Images/Generated images/`: landscape triptychs —
 * front | back | side — of the same sitter, top and backdrop as the
 * loose-hair library, so only the hair changes from style to style.
 * `scripts/loc-generated-images.json` says which sheet is which style in
 * src/content/loc-styles.ts; there is no matching by filename, because
 * half the sheets are called "ChatGPT Image …" and a picture beside the
 * wrong style is worse than a placeholder. A sheet missing from the
 * mapping is reported and skipped.
 *
 * Each becomes three 640x800 files, which `locStyleLooks()` in
 * src/assets/imagery.ts finds by convention:
 *
 *   loc-style-<id>-front|back|side.webp       the first look
 *   loc-style-<id>-<n>-front|back|side.webp   look n, from `"look": n`
 *
 * The cut is the same one `images:generated` makes — see lib/triptych.mjs.
 *
 * Earlier the lookbook carried the salon photographs from the Hairstyle
 * Library PDF as `loc-style-<id>-<n>.webp`. Those are not deleted here:
 * any still in src/assets/images are *moved* to
 * `Locs Images/Removed from app/`, out of the bundle, for a person to
 * delete. Generated angle files are deleted and rewritten, since this
 * script can always make them again.
 *
 * Run:  npm run images:locs
 */
import { mkdir, readFile, readdir, rename, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cutTriptych, sliceTriptych } from './lib/triptych.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = join(root, 'src/assets/images')
const RETIRED = join(root, 'Locs Images/Removed from app')
const MAPPING = JSON.parse(await readFile(join(root, 'scripts/loc-generated-images.json'), 'utf8'))
const SOURCE = join(root, MAPPING.source)

const content = await readFile(join(root, 'src/content/loc-styles.ts'), 'utf8')
const known = new Set([...content.matchAll(/^\s{4}id: '([^']+)',\r?$/gm)].map(([, id]) => id))
if (known.size === 0) throw new Error('read no styles from src/content/loc-styles.ts')

// The old salon photos: numbered, not named by angle.
const retiredNow = []
for (const f of await readdir(IMAGES)) {
  if (!/^loc-style-.+-\d+\.(png|jpe?g|webp|avif)$/i.test(f)) continue
  await mkdir(RETIRED, { recursive: true })
  await rename(join(IMAGES, f), join(RETIRED, f))
  retiredNow.push(f)
}
if (retiredNow.length > 0) {
  console.log(`[locs] moved ${retiredNow.length} old photo(s) to ${RETIRED} — delete them by hand`)
}

// Every generated angle goes, so a style reassigned or held back drops to
// its placeholder rather than keeping a stale picture.
for (const f of await readdir(IMAGES)) {
  if (/^loc-style-.+-(front|back|side)\.webp$/.test(f)) await unlink(join(IMAGES, f))
}

const sources = new Set(await readdir(SOURCE))
let written = 0
for (const [file, { style, look = 1, omit = [], framed = false }] of Object.entries(MAPPING.sheets)) {
  if (!style) {
    console.log(`[locs] ${file}: held back, no style assigned`)
    continue
  }
  if (!known.has(style)) throw new Error(`${file}: no loc style with id "${style}"`)
  if (!sources.has(file)) throw new Error(`${file}: not in ${MAPPING.source}`)

  const prefix = look === 1 ? `loc-style-${style}` : `loc-style-${style}-${look}`
  const cut = framed ? sliceTriptych : cutTriptych
  const { rules } = await cut(join(SOURCE, file), (angle) =>
    join(IMAGES, `${prefix}-${angle}.webp`),
  )
  // A sheet with no real view at some angle carries a stand-in panel so the
  // cut frames like any other; that slot is not written and keeps its
  // placeholder.
  for (const angle of omit) await unlink(join(IMAGES, `${prefix}-${angle}.webp`))
  written += 3 - omit.length
  const skipped = omit.length > 0 ? `, no ${omit.join(', ')}` : ''
  console.log(`[locs] ${file} -> ${prefix} (rules at ${rules[0]}, ${rules[1]}${skipped})`)
}
console.log(`[locs] ${written} files written`)

const unmapped = [...sources].filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && !(f in MAPPING.sheets))
if (unmapped.length > 0) {
  console.log(
    `\n[locs] ${unmapped.length} sheet(s) not in scripts/loc-generated-images.json — ` +
      'add each with the style it shows (or null), then re-run:',
  )
  for (const f of unmapped) console.log(`  ${f}`)
}
const missing = [...known].filter((id) => !Object.values(MAPPING.sheets).some((s) => s.style === id))
if (missing.length > 0) console.log(`[locs] placeholder, no sheet yet: ${missing.join(', ')}`)
