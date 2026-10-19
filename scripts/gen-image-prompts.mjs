/**
 * Generates docs/style-image-prompts.md — one ready-to-paste prompt per
 * image slot, with the filename the app expects.
 *
 * Generated rather than hand-written so it cannot drift from the library:
 * add a style to src/content/styles.ts, re-run this, and its four prompts
 * appear. Hand-maintaining a prompt per slot across a growing library is how
 * the two end up disagreeing about what exists.
 *
 * Run:  npm run images:prompts
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * What is actually in src/assets/images right now.
 *
 * Read from disk rather than inferred from the triage, because the two
 * diverge the moment a condemned file is deleted — and they have: the 14
 * `delete-now` frames are gone. A slot's note below says which of the three
 * states it is in, and getting that from the folder is the only way it stays
 * true without anyone remembering to update it.
 */
const onDisk = new Set(
  (await readdir(join(root, 'src/assets/images')))
    .filter((f) => f.startsWith('style-'))
    .map((f) => f.replace(/\.[^.]+$/, '')),
)

/**
 * Per-photo replacement briefs, keyed id -> angle, from drive-images.json.
 *
 * The imported photography is not release-cleared (see the images README), so
 * every one of the 75 files has to be regenerated rather than licensed. A
 * prompt built from the style name alone produces *a* photo of the style; it
 * does not produce a drop-in swap for the frame already sitting in that slot,
 * which is what keeps the four angles of a style reading as one set and the
 * cards in the grid looking unchanged after the swap.
 *
 * So each angle carries a `composition`: what that specific frame shows —
 * pose, crop, what the hands are doing, wardrobe, jewellery. Recorded against
 * the triage entry because that is already the per-photo record.
 *
 * What the briefs deliberately do NOT carry over: the TikTok and Instagram
 * watermarks, the phone status bars and app chrome, the readable slogans, and
 * the subjects the triage flagged as minors. Those are the reasons the file is
 * being replaced — reproducing them would defeat the exercise. Nor the
 * backgrounds, which are somebody's kitchen: the house style below supplies
 * the ground, and that is what makes 124 separate generations cohere.
 */
const triage = JSON.parse(
  await readFile(join(root, 'scripts/drive-images.json'), 'utf8'),
)

const LOOK = `Warm, natural editorial photography. Soft golden-hour or diffused window light, never flash. Shallow depth of field. Muted warm palette of creams, terracotta and soft browns, against a plain warm background around #fdf9f6.`

const TEXTURE = `Real hair texture with visible individual strands, no plastic skin smoothing, no retouching.`

const FRAME = `Portrait orientation, 4:5, subject cropped at the shoulders.`

/** A still-life slot has no person in it, so it takes neither the hair
 *  texture rule nor the crop-at-the-shoulders instruction. */
const FRAME_ONLY = `Portrait orientation, 4:5.`

const HOUSE = `${LOOK} ${TEXTURE} ${FRAME} No text, no logos, no watermarks, no product packaging.`

const HOUSE_STILL = `${LOOK} ${FRAME_ONLY} No text, no logos, no watermarks, no product packaging.`

const ANGLES = {
  front: 'Shot from directly in front, face forward, showing the hairline and the front of the style.',
  back: 'Shot from directly behind, the back of the head filling the frame, showing the parting, the pattern and how the ends are finished. No face visible.',
  side: 'Full profile from one side, the ear visible, showing how far the style projects from the head.',
  round:
    'A three-quarter turn between front and side, showing how the overall shape reads from an angle.',
}

/** Parse the fields this script needs out of each library entry. */
function parseStyles(source) {
  const body = source.slice(source.indexOf('export const STYLES'))
  const chunks = body.split(/\n  \{\n/).slice(1)
  return chunks
    .map((chunk) => {
      const get = (key) => chunk.match(new RegExp(`${key}: '([^']*)'`))?.[1]
      const id = get('id')
      if (!id) return null
      return {
        id,
        name: get('name'),
        category: get('category'),
        difficulty: get('difficulty'),
        note: get('note'),
        // Absent hairTypes means loose-only — the library's own default.
        locs: /hairTypes: \[[^\]]*'Locs'/.test(chunk),
        looseOnly: !/hairTypes:/.test(chunk),
      }
    })
    .filter(Boolean)
}

function subjectFor(style) {
  if (style.locs && !style.looseOnly) {
    return 'A Black woman with mature traditional locs of slightly varied thickness, with visible new growth at the roots — not freshly retwisted and not uniform'
  }
  return 'A Black woman with type 4 natural hair, dense and tightly coiled, in its real texture'
}

const source = await readFile(join(root, 'src/content/styles.ts'), 'utf8')
const styles = parseStyles(source)

/**
 * Whether a frame's composition is still worth briefing a replacement from.
 *
 * The ten `delete-now` frames flagged `minor` are the hairstyle photographed
 * on a child: the style in them is real and well shot, so the composition
 * still describes what the slot wants once the subject is an adult, and
 * keeping it is what holds the four angles of a style together as one set.
 *
 * The four flagged `off-subject` are a mid-process scalp close-up, two failed
 * crops of a ceiling, and a flat-lay of hairpins on a table. Reproducing those
 * would commission a photograph of something the screen never wanted. They
 * fall back to the generic angle direction, which is the decision the previous
 * pass left open for `beaded-bridal-bun-round` — the file is gone now, so
 * there is no longer a card whose framing has to be preserved.
 */
function briefUsable(shot) {
  return Boolean(shot?.composition) && !shot.flags?.includes('off-subject')
}

/** Slot counts, read against the folder rather than assumed from the triage. */
let matched = 0
let gone = 0
for (const [styleId, angles] of Object.entries(triage)) {
  for (const angle of Object.keys(angles)) {
    if (onDisk.has(`style-${styleId}-${angle}`)) matched++
    else gone++
  }
}

const lines = [
  '# Style image prompts',
  '',
  'Generated by `npm run images:prompts` — do not hand-edit, regenerate it.',
  '',
  `${styles.length} styles x 4 angles = ${styles.length * 4} images.`,
  '',
  '## How to use this',
  '',
  '1. Paste a prompt into any image generator.',
  '2. Save the result as the **filename given above it**, into `src/assets/images/`.',
  '3. Run `npm run images:check` to confirm the app picked it up.',
  '',
  'Any of `.png .jpg .jpeg .webp .avif` works — no conversion needed. Prefer',
  '`.webp` for size. Vite hashes and bundles them into the APK, so they work',
  'offline.',
  '',
  '## Before you commit a batch',
  '',
  '- **Check the texture.** Generators drift towards loose type 3 curls for',
  '  anything labelled "natural hair", and towards neat, uniform, freshly',
  '  retwisted locs. Both are the exception, not the rule. Reject anything that',
  '  looks like a wig or a 3D render.',
  '- **Nobody recognisable.** These illustrate a technique; they are not',
  '  portraits. Reject anything resembling a specific public figure.',
  '- **Check the hands.** Still the reliable tell.',
  '- **Shoot each style as a set.** The four angles must read as the same person',
  '  in the same session — same hair, same light, same background. If your',
  '  generator supports a seed or a reference image, hold it fixed across all',
  '  four. This is the single thing most likely to go wrong.',
  '',
  '## Replacing the imported photography',
  '',
  `${matched} of these slots already hold a file, and **none of those files is`,
  'cleared for release** — they are frames lifted from other people\'s social',
  'videos. See [`src/assets/images/README.md`](../src/assets/images/README.md).',
  '',
  `A further ${gone} slot(s) held a file that has since been deleted — the`,
  'frames triage marked `delete-now`, ten of them showing an identifiable',
  'minor. Those slots are empty in the app today and render a placeholder,',
  'so they are the ones to commission first.',
  '',
  'Every prompt for a filled slot is **matched to the frame it replaces**: the',
  'pose, the crop, what the hands are doing, the wardrobe and the setting are',
  'described from the photo itself, so the generated image drops into the same',
  'card without the grid re-flowing and without the four angles of a style',
  'ceasing to read as one set.',
  '',
  'Four things in those frames are deliberately **not** carried across, because',
  'they are the reason the file is being replaced in the first place:',
  '',
  '- the TikTok and Instagram watermarks and creator handles,',
  '- the phone status bars, back buttons and other app chrome,',
  '- readable slogans on clothing,',
  '- the subjects the triage flagged as minors — every prompt specifies an adult.',
  '',
  'A matched brief **replaces** the generic angle direction rather than joining',
  'it, because some imported frames do not sit at the angle their filename',
  'claims — `style-woven-roll-attachment-front` is shot from above and behind',
  'rather than from the front. Keeping both lines would hand the generator two',
  'contradictory instructions. That one is still worth a decision before you',
  'generate it: reproducing what is on file keeps the card unchanged, but a',
  'true `front` view would serve the screen better. Edit its `composition` in',
  '`scripts/drive-images.json` and re-run this script to change it.',
  '',
  'A brief is dropped where the frame was **not the style at all** — a',
  'mid-process scalp close-up, two crops that failed onto a ceiling, and a',
  'flat-lay of hairpins on a table. Those four get the plain angle direction',
  'instead, because briefing a replacement from them would commission a',
  'photograph of something the screen never wanted. Their files are already',
  'deleted, so there is no card framing left to preserve either.',
  '',
  '## Priority',
  '',
  'Do `front` and `back` for **every** style before doing any style\'s `side` or',
  '`round`. The card in the grid shows one image and the detail screen degrades',
  'gracefully, so two angles across the whole library is worth more than four',
  'angles across a quarter of it — and the back is the view people came for.',
  '',
  '---',
  '',
]

for (const style of styles) {
  lines.push(`## ${style.name}`)
  lines.push('')
  lines.push(
    `\`${style.id}\` · ${style.category} · ${style.difficulty} · ${style.locs ? 'locs' : 'loose natural hair'}`,
  )
  lines.push('')
  if (style.note) lines.push(`> ${style.note}`)
  lines.push('')

  for (const [angle, direction] of Object.entries(ANGLES)) {
    const shot = triage[style.id]?.[angle]
    const present = onDisk.has(`style-${style.id}-${angle}`)
    const brief = briefUsable(shot) ? shot.composition : undefined

    lines.push(`**\`style-${style.id}-${angle}\`**`)
    lines.push('')
    if (shot) {
      const flags = shot.flags?.length ? ` · ${shot.flags.join(', ')}` : ''
      if (present) {
        lines.push(
          `*Replaces a file on disk — triage says \`${shot.action}\`${flags}.` +
            (brief ? ' Prompt below is matched to that frame.*' : '*'),
        )
      } else {
        // The file this slot held has been deleted. Say so rather than
        // leaving the note claiming a file that is not there, and say
        // whether its composition survived it — a reader deciding what to
        // commission needs to know if the prompt reproduces a real shot or
        // is a generic direction.
        lines.push(
          `*Slot is empty — the file here was deleted (\`${shot.action}\`${flags}).` +
            (brief
              ? ' Prompt below still reproduces its framing.*'
              : ' That frame was not this style, so the prompt below is the plain angle.*'),
        )
      }
      lines.push('')
    } else {
      lines.push('*Empty slot — nothing on disk to match.*')
      lines.push('')
    }
    lines.push('```text')
    // A matched brief *is* the direction, and replaces the generic one rather
    // than joining it. Several imported frames do not sit at the angle their
    // filename claims — `woven-roll-attachment-front` is shot from above and
    // behind rather than from the front — so pasting both lines would hand the
    // generator two contradictory instructions.
    //
    // `subject: 'none'` rides on the brief and falls with it: a still-life
    // house style is right only while we are reproducing an actual still life.
    lines.push(
      brief && shot.subject === 'none'
        ? `${brief} ${HOUSE_STILL}`
        : `${subjectFor(style)}, wearing ${style.name.toLowerCase()}. ${brief ?? direction} ${HOUSE}`,
    )
    lines.push('```')
    lines.push('')
  }
  lines.push('---')
  lines.push('')
}

await mkdir(join(root, 'docs'), { recursive: true })
await writeFile(join(root, 'docs/style-image-prompts.md'), lines.join('\n'))
console.log(
  `[prompts] ${styles.length} styles -> ${styles.length * 4} prompts ` +
    `(${matched} matched to a file on disk, ${gone} to a deleted one) ` +
    `in docs/style-image-prompts.md`,
)
