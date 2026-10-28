/**
 * Cuts the generated style sheets into the app's angle slots, each view
 * framed as its own portrait.
 *
 * Each sheet in `Claude outputs/` is one landscape triptych — front, back,
 * side, left to right, split by thin white rules — and the app wants three
 * separate 4:5 files per style, `style-<id>-front|back|side.webp`.
 * `scripts/generated-images.json` says which sheet is which style; a sheet
 * missing from it is matched by filename (see "Sheets nobody has mapped").
 *
 * The cutting itself — finding the rules, framing each view round its
 * subject — is in `lib/triptych.mjs`, shared with `images:locs`.
 *
 * Every existing angle of a mapped style is removed first, so a leftover
 * `-round` from older photography cannot sit in the gallery beside a
 * different person.
 *
 * Run:  npm run images:generated
 */
import { readFile, readdir, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cutTriptych, sliceTriptych } from './lib/triptych.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = join(root, 'src/assets/images')
const MAPPING = JSON.parse(await readFile(join(root, 'scripts/generated-images.json'), 'utf8'))
const SOURCE = join(root, MAPPING.source)

/*
 * Sheets nobody has mapped yet.
 *
 * New sheets keep arriving in the folder, and most are named after their
 * style ("Flat Twist Front Afro.png"). So a file with no entry in the
 * mapping is matched by name against the library — exactly, after
 * dropping case, punctuation and words like "front", "views" or
 * "triptych" — and used if it names exactly one style. Anything looser
 * is reported, not guessed: a picture beside the wrong method is worse
 * than a placeholder. An explicit entry in the mapping always wins,
 * including `style: null` to hold a sheet back.
 */
const NOISE = new Set(
  'front back side view views triptych hairstyle hairstyles reference three and with the a'.split(' '),
)
/** Two strengths: exact words first, then with the noise words dropped. */
const normalise = (s, loose) =>
  s
    .toLowerCase()
    .replace(/\.[a-z]+$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !(loose && NOISE.has(w)))
    .join(' ')

const library = await readFile(join(root, 'src/content/styles.ts'), 'utf8')
const known = [
  ...library.matchAll(/^\s{4}id: '([^']+)',\r?\n\s{4}name: '([^']+)',\r?$/gm),
].map(([, id, name]) => ({ id, name }))
if (known.length === 0) throw new Error('read no styles from src/content/styles.ts')

// Exact first, so "Curved Weave-Back Bun" is not also "Curved Weave Bun"
// once "back" is dropped; the loose pass only runs when exact finds none.
function matchStyle(file) {
  for (const loose of [false, true]) {
    const key = normalise(file, loose)
    const hits = known.filter(
      (s) => normalise(s.id, loose) === key || normalise(s.name, loose) === key,
    )
    if (hits.length > 0) return hits
  }
  return []
}

const sheets = { ...MAPPING.sheets }
const unmatched = []
for (const file of await readdir(SOURCE)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file) || file in sheets) continue
  const hits = matchStyle(file)
  if (hits.length === 1) {
    sheets[file] = { style: hits[0].id }
    console.log(`[generated] ${file}: matched by name to ${hits[0].id}`)
  } else {
    unmatched.push(file)
  }
}

const existing = await readdir(IMAGES)
let written = 0

for (const [file, { style, framed = false }] of Object.entries(sheets)) {
  if (!style) {
    console.log(`[generated] ${file}: held back, no style assigned`)
    continue
  }

  for (const f of existing.filter((f) => f.startsWith(`style-${style}-`) || f.startsWith(`style-${style}.`))) {
    await unlink(join(IMAGES, f))
  }

  const cut = framed ? sliceTriptych : cutTriptych
  const { rules } = await cut(join(SOURCE, file), (angle) =>
    join(IMAGES, `style-${style}-${angle}.webp`),
  )
  written += 3
  console.log(`[generated] ${file} -> ${style} (rules at ${rules[0]}, ${rules[1]})`)
}

console.log(`[generated] ${written} files written`)

if (unmatched.length > 0) {
  console.log(
    `\n[generated] ${unmatched.length} sheet(s) match no style by name — add each to ` +
      'scripts/generated-images.json with the style id it shows, then re-run:',
  )
  for (const f of unmatched) console.log(`  ${f}`)
}
