/**
 * Cuts one generated triptych — front | back | side, split by thin white
 * rules — into three 4:5 portraits, each view framed round its subject.
 *
 * Shared by `images:generated` (the loose-hair library) and `images:locs`
 * (the loc lookbook): both sets come from the same studio sheets — one
 * sitter, one top, one cream backdrop — so they are cut the same way.
 *
 * Two things are found rather than assumed:
 *
 * - **The rules.** They sit near the thirds but not exactly on them, and
 *   cutting a pixel late leaves a white hairline down the edge of every
 *   slide. They are the only near-white full-height columns in the sheet
 *   (the backdrop is cream, not white), so they are easy to find.
 * - **The subject.** A panel is 1:2 and the slot is 4:5, and the sitter
 *   is not centred in it — see `measure()` and the framing constants.
 *   Cropping below the shoulders also drops the captions some sheets
 *   carry along the bottom.
 */
import sharp from 'sharp'

export const ANGLES = ['front', 'back', 'side']

/*
 * Framing. Each view is reframed as a portrait rather than cut as a fixed
 * window: the sheets put the side-view face against the right edge and the
 * bun against the left, and tall hair runs to within a few pixels of the
 * top. So the head and hair are found, and the 4:5 frame is built round
 * them — centred on them, the same headroom above every view, the neck at
 * the same height, and one scale shared by all three views of a style so
 * that swiping front to back to side does not zoom in and out.
 */

/** Space above the hair, as a share of the frame height. */
const HEADROOM = 0.07
/** Where the neck sits, as a share of the frame height — below it, shoulders. */
const NECK_AT = 0.72
/** Widest the head and hair may be, as a share of the frame width. */
const MAX_HEAD_WIDTH = 0.86
/** Every slot is written at this size, so the three views match exactly. */
const OUT = { width: 640, height: 800 }

/**
 * A column whose darkest channel averages near white is a rule.
 *
 * An average rather than a per-pixel count: the rules are not all pure
 * white (some sheets draw them at ~250 with noise), while the backdrop
 * and the shirt either side never average above ~225.
 */
function findRules(data, width, height, channels) {
  const isRule = []
  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let y = 0; y < height; y += 4) {
      const i = (y * width + x) * channels
      sum += Math.min(data[i], data[i + 1], data[i + 2])
    }
    isRule.push(sum / Math.ceil(height / 4) > 240)
  }
  // Group runs of rule columns near each third.
  const runs = []
  for (let x = 0; x < width; x++) {
    if (!isRule[x]) continue
    const last = runs.at(-1)
    if (last && x === last.end + 1) last.end = x
    else runs.push({ start: x, end: x })
  }
  const near = (target) =>
    runs
      .filter((r) => Math.abs((r.start + r.end) / 2 - target) < width * 0.06)
      .sort((a, b) => Math.abs(a.start - target) - Math.abs(b.start - target))[0]
  const a = near(width / 3)
  const b = near((2 * width) / 3)
  if (!a || !b) throw new Error('could not find both panel rules')
  return [a, b]
}

/**
 * Where the subject is inside one panel.
 *
 * Foreground is anything far enough from the backdrop colour, sampled from
 * the panel's top corners. Hair, skin and the brown top all clear that by
 * a wide margin; the backdrop's gentle vignette does not. The neck is the
 * narrowest row in the band just above the shoulders — searched only
 * there, because a high bun has a waist of its own between bun and head
 * that would otherwise pass for one.
 */
function measure(data, width, channels, x0, x1, height) {
  const span = x1 - x0
  const bg = [0, 0, 0]
  let n = 0
  for (let y = 2; y < 14; y++) {
    for (const x of [x0 + 4, x0 + 12, x0 + 20, x1 - 20, x1 - 12, x1 - 4]) {
      const i = (y * width + x) * channels
      bg[0] += data[i]
      bg[1] += data[i + 1]
      bg[2] += data[i + 2]
      n++
    }
  }
  bg.forEach((v, k) => (bg[k] = v / n))

  const rows = []
  for (let y = 0; y < height; y++) {
    let count = 0
    let left = -1
    let right = -1
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * channels
      const d =
        Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2])
      if (d > 60) {
        count++
        if (left < 0) left = x
        right = x
      }
    }
    rows.push({ count, left, right })
  }

  const top = Math.max(0, rows.findIndex((r) => r.count > span * 0.02))
  // Walked up from the bottom edge: the shirt fills most of every row down
  // there, and the shoulders are where that block ends. Searching down
  // from the top instead finds a big afro or a bun first — they are wider
  // than 60% of a panel too.
  let shoulders = height
  while (shoulders > top + 150 && rows[shoulders - 1].count > span * 0.6) shoulders--
  // Hair worn down past the shoulders is wider than 60% of the panel all
  // the way up, so the walk above climbs to the crown. Only then, walk
  // again counting just the rows the shirt fills edge to edge — a frame
  // the first walk got right is never touched.
  if (shoulders < height * 0.45) {
    shoulders = height
    while (shoulders > top + 150 && rows[shoulders - 1].count > span * 0.95) shoulders--
  }
  if (shoulders === height) shoulders = Math.round(height * 0.7)
  let neck = shoulders - 1
  for (let y = Math.max(top + 120, shoulders - 220); y < shoulders; y++) {
    if (rows[y].count < rows[neck].count) neck = y
  }

  const lefts = []
  const rights = []
  for (let y = top; y <= neck; y++) {
    if (rows[y].count < 4) continue
    lefts.push(rows[y].left)
    rights.push(rows[y].right)
  }
  lefts.sort((a, b) => a - b)
  rights.sort((a, b) => a - b)
  const left = lefts[Math.floor(lefts.length * 0.02)] ?? x0
  const right = rights[Math.ceil(rights.length * 0.98) - 1] ?? x1

  return { top, neck, left, right }
}

/**
 * Cut a sheet and write its three views.
 *
 * `outFor(angle)` names the file for each of `ANGLES`. Returns where the
 * rules were found, for the log line.
 */
export async function cutTriptych(input, outFor) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const [a, b] = findRules(data, width, height, channels)

  // Two pixels of extra trim each side of a rule: anti-aliasing leaves a
  // lighter column that reads as a hairline against the cream.
  const panels = [
    [0, a.start - 2],
    [a.end + 3, b.start - 2],
    [b.end + 3, width],
  ]

  const subjects = panels.map(([x0, x1]) => measure(data, width, channels, x0, x1, height))

  // One frame height for the whole style: the one that fits the largest
  // view, so the head is the same size in all three.
  //
  // Capped at the panel's own width. A wider frame has to be padded out
  // past the panel, and on the front and back views what sits at the
  // panel edge is shirt — repeated outward it becomes a flat brown block
  // where the shoulders should round off. At the cap, a tall style gives
  // up some shoulder rather than its headroom (the top is placed first).
  const maxH = Math.min(...panels.map(([x0, x1]) => x1 - x0)) / 0.8
  const frameH = Math.min(
    maxH,
    Math.max(
      ...subjects.map(({ top, neck, left, right }) =>
        Math.max((neck - top) / (NECK_AT - HEADROOM), (right - left) / (MAX_HEAD_WIDTH * 0.8)),
      ),
    ),
  )
  const frameW = frameH * 0.8

  for (const [index, [x0, x1]] of panels.entries()) {
    const { top, neck, left, right } = subjects[index]
    // Centre on the head and hair; set the vertical so the neck lands at
    // NECK_AT, which keeps headroom even for a short style in a frame
    // sized for a tall one.
    const cx = (left + right) / 2
    const fw = Math.round(frameW)
    const fh = Math.round(frameH)
    // A front or back view is already close to centred in its third; a
    // few pixels of off-centre are not worth padding for, so it snaps
    // inside the panel. Only a real shift — the profile — overhangs.
    const centred = Math.round(cx - frameW / 2)
    const inside = Math.max(x0, Math.min(x1 - fw, centred))
    const fx = Math.abs(inside - centred) < fw * 0.08 ? inside : centred
    const fy = Math.round(Math.min(top - frameH * HEADROOM, neck - frameH * NECK_AT))

    // The frame can run past the panel — a profile is not centred in its
    // third. Take what is there and continue the edges outward; the
    // backdrop is flat, so the seam does not show.
    const ix0 = Math.max(fx, x0)
    const ix1 = Math.min(fx + fw, x1)
    const iy0 = Math.max(fy, 0)
    const iy1 = Math.min(fy + fh, height)

    // Two passes on purpose: sharp runs its pipeline in a fixed order —
    // resize before extend, whatever order they are called in — so in one
    // chain the padding would be added after scaling, at the wrong size.
    const framed = await sharp(input)
      .extract({ left: ix0, top: iy0, width: ix1 - ix0, height: iy1 - iy0 })
      .extend({
        left: ix0 - fx,
        right: fx + fw - ix1,
        top: iy0 - fy,
        bottom: fy + fh - iy1,
        extendWith: 'copy',
      })
      .png()
      .toBuffer()

    // Repeated edge pixels are invisible on the flat backdrop but turn the
    // ribbed top into streaks, so the added side strips are softened: the
    // shirt carries on as plain brown fabric instead of a barcode.
    const padLeft = ix0 - fx
    const padRight = fx + fw - ix1
    let finished = framed
    if (padLeft > 0 || padRight > 0) {
      const soft = await sharp(framed).blur(10).png().toBuffer()
      const strips = []
      if (padLeft > 0) {
        strips.push({
          input: await sharp(soft).extract({ left: 0, top: 0, width: padLeft, height: fh }).toBuffer(),
          left: 0,
          top: 0,
        })
      }
      if (padRight > 0) {
        strips.push({
          input: await sharp(soft)
            .extract({ left: fw - padRight, top: 0, width: padRight, height: fh })
            .toBuffer(),
          left: fw - padRight,
          top: 0,
        })
      }
      finished = await sharp(framed).composite(strips).png().toBuffer()
    }

    await sharp(finished)
      .resize(OUT.width, OUT.height, { fit: 'fill', kernel: 'lanczos3' })
      .webp({ quality: 84 })
      .toFile(outFor(ANGLES[index]))
  }

  return { rules: [a.start, b.start] }
}

/**
 * Cut a sheet whose panels are already framed 4:5 portraits — split at the
 * rules and write each view as it is, with no reframing. `measure()` finds
 * the neck from the band of shirt at the foot of a tall panel; a panel that
 * is already a portrait has almost none, so reframing it would drop the
 * frame to the forehead.
 */
export async function sliceTriptych(input, outFor) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const [a, b] = findRules(data, width, height, channels)
  const panels = [
    [0, a.start],
    [a.end + 1, b.start],
    [b.end + 1, width],
  ]
  for (const [index, [x0, x1]] of panels.entries()) {
    await sharp(input)
      .extract({ left: x0, top: 0, width: x1 - x0, height })
      .resize(OUT.width, OUT.height, { fit: 'fill', kernel: 'lanczos3' })
      .webp({ quality: 84 })
      .toFile(outFor(ANGLES[index]))
  }
  return { rules: [a.start, b.start] }
}
