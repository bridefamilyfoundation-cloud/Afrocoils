/**
 * Subsets the Material Symbols variable font down to the icons this app
 * actually renders.
 *
 * The full font is ~3.8 MB — the single largest thing in the bundle, for the
 * sake of about two dozen glyphs.
 *
 * Two details make the difference between a 3.3 MB subset and a tiny one:
 *
 * 1. Subset by CODEPOINT, not by icon name. Material Symbols resolves names
 *    like "check_circle" through ligatures, so subsetting by name retains the
 *    glyphs for a–z, and harfbuzz's layout closure then keeps nearly every
 *    ligature in the font. Codepoints skip the ligature table entirely.
 * 2. Pin every variation axis. The per-glyph variation data (`gvar`) dominates
 *    a variable font; instancing it away is worth more than dropping glyphs.
 *    We emit one static per FILL value, since that is the only axis the UI
 *    varies (active bottom-nav tabs, reached milestones).
 *
 * Run via `npm run icons:subset`; `prebuild` runs it automatically so a fresh
 * clone can't accidentally ship the full font.
 */
import { createRequire } from 'node:module'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

import CODEPOINTS from '../src/components/icon-codepoints.json' with { type: 'json' }

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(root, 'src/assets/fonts')

// The same map the app renders from, so the font can never drift from the UI.
const names = Object.keys(CODEPOINTS)
const glyphs = Object.values(CODEPOINTS)
  .map((hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .join('')

const source = join(
  dirname(require.resolve('material-symbols/package.json')),
  'material-symbols-outlined.woff2',
)
const original = await readFile(source)

const VARIANTS = [
  { name: 'outlined', fill: 0 },
  { name: 'filled', fill: 1 },
]

await mkdir(OUT_DIR, { recursive: true })

let total = 0
for (const variant of VARIANTS) {
  const subset = await subsetFont(original, glyphs, {
    targetFormat: 'woff2',
    variationAxes: {
      FILL: variant.fill,
      wght: 400,
      GRAD: 0,
      opsz: 24,
    },
    preserveNameIds: [],
  })

  const outFile = join(OUT_DIR, `material-symbols-${variant.name}.woff2`)
  await writeFile(outFile, subset)

  // Guard against a silently-empty subset shipping to users.
  const { size } = await stat(outFile)
  if (size < 512) {
    throw new Error(`[icons] ${variant.name} subset is implausibly small (${size} B) — aborting.`)
  }

  total += size
  console.log(`[icons]   ${variant.name.padEnd(8)} ${(size / 1024).toFixed(1)} KB`)
}

const before = original.length
console.log(
  `[icons] ${names.length} glyphs | ${(before / 1024 / 1024).toFixed(2)} MB -> ` +
    `${(total / 1024).toFixed(1)} KB total ` +
    `(${(100 * (1 - total / before)).toFixed(1)}% smaller)`,
)
