/**
 * Imports the style photography from the shared Drive library into
 * src/assets/images/, named for the slots the app resolves by convention.
 *
 * The source is the "Hairstyle Library" folder: one folder per style,
 * holding a `Directions` doc and two to four phone photographs labelled
 * Front / Back / Side. `scripts/drive-images.json` maps each style id to
 * the Drive file id behind each angle; that mapping is checked in so this
 * script needs no network crawl and no credentials — the files are shared
 * by link.
 *
 * The photographs are 720x1600-ish portrait phone shots, which is neither
 * the aspect the app draws them at nor a size worth putting in an APK.
 * Every surface that renders a style image does so with `object-cover`
 * (4:5 in the gallery, square in the thumbnail strip, a 96px square on a
 * card), so a tall source gets centre-cropped by the browser — and the
 * centre of a phone portrait is a shoulder, not the hair. Cropping here
 * with sharp's attention strategy instead puts the crop where the subject
 * actually is, once, at build-your-assets time rather than per device.
 *
 * Idempotent: a slot that already has a file is left alone unless --force.
 *
 * Run:  npm run images:import
 */
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = join(root, 'src/assets/images')
const MANIFEST = join(root, 'scripts/drive-images.json')

/**
 * 4:5 at 880px wide.
 *
 * The widest this is ever drawn is the gallery hero, which is the full
 * content column — under 430 CSS px on a phone, so 880 covers a 2x screen
 * and most of a 3x one. Going higher buys nothing visible and costs APK
 * size on every one of the seventy-five files.
 */
const WIDTH = 880
const HEIGHT = 1100
const QUALITY = 72

const force = process.argv.includes('--force')
const noTrim = process.argv.includes('--no-trim')

/* ------------------------------------------------------------------ *
 * Finding the actual photograph inside the frame
 *
 * These are screen recordings, so a lot of what arrives is not the
 * photograph: solid black or navy letterbox bars above and below, and —
 * worst case — a narrow upright video pillarboxed inside a blurred,
 * enlarged copy of itself, which is what the source app pads with. Crop
 * that away before anything else and the 4:5 crop below has real
 * material to work with instead of spending half its height on padding.
 *
 * Detection is by detail, not by colour, because the padding is not one
 * colour: a solid bar and a blurred backdrop are both *smooth*, and the
 * photograph is not. So score every row and column by how much its
 * pixels change along it, and walk in from each edge for as long as
 * that score stays near zero.
 * ------------------------------------------------------------------ */

/** Width the row pass measures at. Bars are gross features; 160px finds them. */
const PROBE_WIDTH = 160
/** Detail, as a share of the frame's busy end, at or above which a line is content. */
const ROW_KEEP = 0.35
const COL_KEEP = 0.5
/** Below this share of a dimension the span is not believed, and that axis is left alone. */
const MIN_SPAN = 0.3
/**
 * Trim only where what is being thrown away is markedly quieter than
 * what is kept.
 *
 * The span on its own is not enough to justify a cut. Padding and a
 * merely calmer edge of a photograph both show up as a lull in the
 * detail profile, and telling them apart by *width* fails in both
 * directions — one frame here is 61% letterbox and wants a savage trim,
 * another is an ordinary close-up whose quiet edges want none at all.
 * The thing that actually separates them is contrast: real padding is a
 * fraction as busy as the picture, an ordinary background is not. So
 * measure both sides of the proposed cut and only make it when the
 * discarded material is under this share of the kept material.
 */
const TRIM_CONTRAST = 0.55

/** The value at the given percentile of a copy of `values`. */
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}

/**
 * The longest unbroken span of lines scoring at or above `threshold`,
 * as `[start, end)`.
 *
 * Deliberately not "walk in from each edge until it gets busy", which is
 * the obvious approach and does not survive contact with these frames:
 * the padding is not reliably quiet. One of them carries a caption burnt
 * over the blurred filler down the left-hand side, and text is about the
 * highest-detail thing an image can contain — so an edge walk stops on
 * the first column and trims nothing. Asking instead where the *longest
 * continuous run of real detail* is finds the photograph regardless of
 * what is scrawled on the padding either side of it.
 */
function longestSpan(scores, threshold) {
  let best = [0, scores.length]
  let bestLen = 0
  let start = -1
  for (let i = 0; i <= scores.length; i++) {
    const inside = i < scores.length && scores[i] >= threshold
    if (inside && start < 0) start = i
    if (!inside && start >= 0) {
      if (i - start > bestLen) {
        bestLen = i - start
        best = [start, i]
      }
      start = -1
    }
  }
  return bestLen === 0 ? [0, scores.length] : best
}

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)

/**
 * Whether cutting `scores` down to `[start, end)` is worth doing: wide
 * enough to believe, and discarding material clearly quieter than what
 * it keeps.
 */
function worthTrimming(scores, [start, end]) {
  if (start === 0 && end === scores.length) return false
  if (end - start < scores.length * MIN_SPAN) return false
  const kept = mean(scores.slice(start, end))
  const dropped = mean([...scores.slice(0, start), ...scores.slice(end)])
  return kept > 0 && dropped < kept * TRIM_CONTRAST
}

/** Mean absolute difference between neighbouring pixels, per row and per column. */
function detailProfiles(data, w, h) {
  const rows = new Array(h).fill(0)
  const cols = new Array(w).fill(0)
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      rows[y] += Math.abs(data[y * w + x] - data[y * w + x - 1])
      cols[x] += Math.abs(data[y * w + x] - data[(y - 1) * w + x])
    }
  }
  for (let y = 0; y < h; y++) rows[y] /= w
  for (let x = 0; x < w; x++) cols[x] /= h
  return { rows, cols }
}

/**
 * The bounding box of the photograph within the frame, in source pixels.
 * Returns undefined when there is nothing worth trimming.
 *
 * Two passes, and the order matters. Letterbox bars run the full width,
 * so until they are gone every column's score is dragged towards theirs
 * and the blurred filler either side of a pillarboxed video is
 * indistinguishable from the video. Cut the bars first, re-measure the
 * columns on what is left, and the two separate cleanly.
 *
 * The column pass measures at full resolution rather than at
 * PROBE_WIDTH, because what marks the filler out is that it is *blurred*
 * — and downscaling to 160px blurs everything, erasing the very
 * difference being looked for.
 */
async function contentBox(image, meta) {
  const probe = await image
    .clone()
    .resize({ width: PROBE_WIDTH })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { rows } = detailProfiles(probe.data, probe.info.width, probe.info.height)
  const rowSpan = longestSpan(rows, percentile(rows, 0.9) * ROW_KEEP)
  const [top, rowEnd] = worthTrimming(rows, rowSpan) ? rowSpan : [0, probe.info.height]

  const vScale = meta.height / probe.info.height
  const band = {
    left: 0,
    top: Math.round(top * vScale),
    width: meta.width,
    height: Math.round((rowEnd - top) * vScale),
  }
  band.height = Math.min(band.height, meta.height - band.top)

  const full = await image
    .clone()
    .extract(band)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { cols } = detailProfiles(full.data, full.info.width, full.info.height)
  const colSpan = longestSpan(cols, percentile(cols, 0.9) * COL_KEEP)
  const [left, colEnd] = worthTrimming(cols, colSpan) ? colSpan : [0, full.info.width]

  const box = {
    left,
    top: band.top,
    width: colEnd - left,
    height: band.height,
  }
  if (box.left === 0 && box.top === 0 && box.width === meta.width && box.height === meta.height) {
    return undefined
  }
  return box.width > 0 && box.height > 0 ? box : undefined
}

/**
 * Grow a content box out to the target aspect, staying inside the source.
 *
 * Without this the crop below magnifies. A content box narrower than 4:5
 * — which is most of them, since the source is an upright phone video —
 * would otherwise be cover-cropped by cutting its *height* away, and a
 * 263x675 box becomes a 2.5x zoom into somebody's face with the hair
 * out of frame. That is the wrong trade for a hair app twice over: the
 * subject is the style, not the person, and these frames have no
 * resolution to spare for magnifying.
 *
 * So the trim decides where the photograph is, and this decides how much
 * around it to keep — always by taking neighbouring pixels back rather
 * than by throwing more of the subject away.
 */
/**
 * How much of a vertical crop comes off the bottom rather than the top.
 *
 * 1 would pin the frame to the very top of the content box and behead
 * the wearer; 0.5 is the centred cut that lost the hair. Three quarters
 * keeps the style whole and still leaves a face in shot.
 */
const HEAD_BIAS = 0.75

function fitAspect(box, meta, aspect) {
  const fitted = { ...box }

  if (fitted.width / fitted.height < aspect) {
    const want = Math.min(meta.width, Math.round(fitted.height * aspect))
    fitted.left = Math.round(fitted.left + fitted.width / 2 - want / 2)
    fitted.width = want
  } else {
    const want = Math.min(meta.height, Math.round(fitted.width / aspect))
    // Take the height off the bottom, not evenly off both ends. Centring
    // the cut is what put the bun out of frame in the first import: the
    // subject of every one of these pictures sits *above* the face, so
    // the shoulders are what there is to spare.
    fitted.top = Math.round(fitted.top + (fitted.height - want) * (1 - HEAD_BIAS))
    fitted.height = want
  }

  // Slide back inside the frame rather than shrinking, so the aspect holds.
  fitted.left = Math.max(0, Math.min(fitted.left, meta.width - fitted.width))
  fitted.top = Math.max(0, Math.min(fitted.top, meta.height - fitted.height))
  return fitted
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
await mkdir(IMAGES, { recursive: true })

const existing = new Set(await readdir(IMAGES).catch(() => []))

let written = 0
let skipped = 0
let bytes = 0
const failures = []

/**
 * One angle's manifest entry.
 *
 * The mapping used to be `angle: "<driveId>"`. It now carries the
 * provenance triage alongside the id — who the frame belongs to, and what
 * is to be done about it — because a Drive file id on its own gives no
 * way back to a person to ask. Both shapes are read so an older checkout
 * of the mapping still imports.
 */
function entryOf(value) {
  return typeof value === 'string' ? { drive: value, action: 'reshoot', flags: [] } : value
}

let blocked = 0

for (const [styleId, angles] of Object.entries(manifest)) {
  for (const [angle, value] of Object.entries(angles)) {
    const entry = entryOf(value)
    const fileId = entry.drive
    const name = `style-${styleId}-${angle}.webp`

    /*
     * Never re-import a frame triage has condemned.
     *
     * `delete-now` is carried by frames showing an identifiable minor, and
     * by frames that are not the hairstyle at all. Deleting those from
     * `src/assets/images/` and leaving the importer able to pull them back
     * on the next run would make the deletion a formality — so the refusal
     * lives here, next to the fetch, rather than in a checklist.
     */
    if (entry.action === 'delete-now') {
      blocked++
      continue
    }

    if (!force && existing.has(name)) {
      skipped++
      continue
    }

    try {
      // The `uc?export=download` endpoint serves the bytes directly for a
      // link-shared file. Large files interpose a virus-scan interstitial;
      // these are all a few hundred KB, well under that threshold.
      const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const source = Buffer.from(await res.arrayBuffer())
      if (!res.headers.get('content-type')?.startsWith('image/')) {
        throw new Error(`not an image (${res.headers.get('content-type')})`)
      }

      // Phone photos carry their orientation in EXIF; without this the
      // portrait shots import on their side. Baked in before anything
      // measures the frame, so the box below is in upright coordinates.
      const upright = sharp(await sharp(source).rotate().toBuffer())
      const meta = await upright.metadata()

      const found = noTrim ? undefined : await contentBox(upright, meta)
      const box = found ? fitAspect(found, meta, WIDTH / HEIGHT) : undefined
      const pipeline = box ? upright.clone().extract(box) : upright.clone()

      const out = await pipeline
        // `strategy.attention` finds the face, which is exactly the wrong
        // thing to centre on here — it is the most salient region of the
        // picture and the least relevant one. Anchor north instead, for
        // the same reason HEAD_BIAS exists.
        .resize(WIDTH, HEIGHT, { fit: 'cover', position: sharp.gravity.north })
        .webp({ quality: QUALITY })
        .toBuffer()

      await writeFile(join(IMAGES, name), out)
      bytes += out.length
      written++
      const trimmed = box
        ? `${meta.width}x${meta.height} -> found ${found.width}x${found.height} -> kept ${box.width}x${box.height}`
        : 'no border'
      console.log(`[images] ${name.padEnd(44)} ${(out.length / 1024).toFixed(0).padStart(3)} KB  ${trimmed}`)
    } catch (error) {
      failures.push(`${name}: ${error.message}`)
    }
  }
}

const total = (await readdir(IMAGES))
  .filter((f) => f.endsWith('.webp'))
  .map((f) => join(IMAGES, f))
let onDisk = 0
for (const path of total) onDisk += (await stat(path)).size

console.log(
  `\n[images] ${written} written (${(bytes / 1024 / 1024).toFixed(1)} MB), ${skipped} already present`,
)
if (blocked > 0) {
  console.log(
    `[images] ${blocked} refused by triage (action: delete-now) - see docs/image-triage.md`,
  )
}
console.log(`[images] ${total.length} files in src/assets/images, ${(onDisk / 1024 / 1024).toFixed(1)} MB total`)

if (failures.length > 0) {
  console.log('\nFailed:')
  for (const f of failures) console.log(`  ${f}`)
  process.exitCode = 1
}
