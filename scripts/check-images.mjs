/**
 * Reports which style image slots are filled and which are still empty.
 *
 * The app resolves images by filename convention rather than by an import
 * list, which is what makes dropping a file into src/assets/images/ enough
 * to fill a slot — and also what makes a typo silently do nothing. This
 * turns that silence into a report.
 *
 * Run after generating a batch:  npm run images:check
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = join(root, 'src/assets/images')
const ANGLES = ['front', 'back', 'side', 'round']
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'avif']

/**
 * Style ids, read straight out of the library source.
 *
 * A regex rather than an import because this file is plain node and the
 * library is TypeScript — and because the only thing needed here is the id
 * list, which is unambiguous in the source text.
 */
const source = await readFile(join(root, 'src/content/styles.ts'), 'utf8')
const ids = [...source.matchAll(/^\s{4}id: '([^']+)',$/gm)].map((m) => m[1])

let present = []
try {
  present = await readdir(IMAGES)
} catch {
  console.error(`[images] ${IMAGES} does not exist yet.`)
  process.exit(1)
}

const have = new Set(
  present
    .filter((f) => EXTENSIONS.includes(f.split('.').pop()?.toLowerCase() ?? ''))
    .map((f) => f.replace(/\.[^.]+$/, '')),
)

let filled = 0
const total = ids.length * ANGLES.length
const missingByStyle = []

for (const id of ids) {
  const missing = ANGLES.filter((a) => !have.has(`style-${id}-${a}`))
  filled += ANGLES.length - missing.length
  if (missing.length > 0) missingByStyle.push({ id, missing })
}

const covers = ids.filter((id) =>
  ANGLES.some((a) => have.has(`style-${id}-${a}`)) || have.has(`style-${id}`),
).length

console.log(`[images] ${ids.length} styles, ${ANGLES.length} angles each`)
console.log(`[images] ${filled}/${total} angle slots filled`)
console.log(`[images] ${covers}/${ids.length} styles have at least one image (a usable card)`)

if (missingByStyle.length > 0) {
  console.log('\nStill missing:')
  for (const { id, missing } of missingByStyle) {
    console.log(`  ${id.padEnd(22)} ${missing.join(', ')}`)
  }
}

// Files in the folder that match no slot at all — almost always a naming
// slip, and otherwise invisible because an unmatched file simply never loads.
const known = new Set(ids.flatMap((id) => [`style-${id}`, ...ANGLES.map((a) => `style-${id}-${a}`)]))
const orphans = [...have].filter((n) => n.startsWith('style-') && !known.has(n))
if (orphans.length > 0) {
  console.log('\nFiles matching no style slot (check the spelling):')
  for (const o of orphans) console.log(`  ${o}`)
}

/*
 * Rights, which is the part coverage cannot see.
 *
 * A filled slot and a shippable slot are different things: every
 * `style-*` file in this folder is a frame lifted from somebody else's
 * video, and a filled grid says nothing about whether it can go in an
 * APK. The triage in scripts/drive-images.json is the record of which is
 * which, and this prints it beside the coverage so the two are never read
 * apart.
 *
 * Absence of a visible watermark is not a licence. `reshoot` is the
 * default for exactly that reason.
 */
const manifest = JSON.parse(await readFile(join(root, 'scripts/drive-images.json'), 'utf8'))
const tracked = new Map()
for (const [styleId, angles] of Object.entries(manifest)) {
  for (const [angle, value] of Object.entries(angles)) {
    const entry = typeof value === 'string' ? { action: 'reshoot', flags: [] } : value
    tracked.set(`style-${styleId}-${angle}`, entry)
  }
}

// Slots cut from the generated sheets by `npm run images:generated`.
// Checked before the Drive verdicts: a re-illustrated style still has its
// old Drive entry, and that entry describes a file no longer on disk.
const generatedMap = JSON.parse(
  await readFile(join(root, 'scripts/generated-images.json'), 'utf8'),
)
const generated = new Set(
  Object.values(generatedMap.sheets)
    .filter((s) => s.style)
    .flatMap((s) => ['front', 'back', 'side'].map((a) => `style-${s.style}-${a}`)),
)

const onDisk = [...have].filter((n) => n.startsWith('style-'))
const buckets = {
  generated: [],
  'delete-now': [],
  trace: [],
  reshoot: [],
  untracked: [],
  unknown: [],
}
for (const name of onDisk) {
  if (generated.has(name)) {
    buckets.generated.push(name)
    continue
  }
  const entry = tracked.get(name)
  // A file with no entry at all and a file with a verdict nobody recognises
  // are different problems: the first needs provenance recording, the second
  // is a typo in a verdict that is silently not being enforced. Filing the
  // second under "untracked" sends the reader looking for the wrong thing.
  if (!entry) buckets.untracked.push(name)
  else if (buckets[entry.action]) buckets[entry.action].push(name)
  else buckets.unknown.push(name)
}

console.log(
  `\n[rights] ${onDisk.length} style files on disk: ${buckets.generated.length} generated ` +
    `(scripts/generated-images.json), ${onDisk.length - buckets.generated.length} Drive frames, ` +
    'and no Drive frame is cleared for release',
)
console.log(
  `[rights] ${buckets['delete-now'].length} delete-now, ${buckets.trace.length} trace, ` +
    `${buckets.reshoot.length} reshoot, ${buckets.untracked.length} untracked`,
)

const minors = onDisk.filter(
  (n) => !generated.has(n) && tracked.get(n)?.flags?.includes('minor'),
)
if (minors.length > 0) {
  console.log(`\n[rights] ${minors.length} file(s) show an identifiable minor and go first:`)
  for (const m of minors) console.log(`  ${m}`)
}

const stillHere = buckets['delete-now'].filter((n) => !minors.includes(n))
if (stillHere.length > 0) {
  console.log(`\n[rights] ${stillHere.length} further file(s) marked delete-now are still present:`)
  for (const f of stillHere) console.log(`  ${f}`)
}

// Say so when the folder is clean, rather than only ever reporting a problem.
// This is the line the triage doc tells a reader to check for after deleting
// the condemned frames, and an absence of output is not an answer.
const condemned = [...tracked.values()].filter((e) => e.action === 'delete-now').length
if (buckets['delete-now'].length === 0) {
  console.log(
    `\n[rights] Clean: all ${condemned} delete-now file(s) are off the disk. ` +
      'Their slots render a placeholder.',
  )
}

if (buckets.untracked.length > 0) {
  console.log('\n[rights] No provenance recorded - add them to scripts/drive-images.json:')
  for (const f of buckets.untracked) console.log(`  ${f}`)
}

if (buckets.unknown.length > 0) {
  console.log('\n[rights] Unrecognised verdict - not one of delete-now, trace, reshoot:')
  for (const f of buckets.unknown) console.log(`  ${f} (${tracked.get(f).action})`)
}

console.log(
  `\n${covers === ids.length ? 'Every style has a card image.' : `${ids.length - covers} styles still render a placeholder card.`}`,
)
