// Cuts every raster the app identifies itself with from one logo file.
//
//   npm run brand:import                 # from src/assets/brand/afrocoils-logo.png
//   npm run brand:import -- path/to.png  # from a different (larger) original
//
// The logo is the illustration above the "AfroCoils" wordmark, on a flat
// cream field. Three cuts go to src/assets/brand/ for the app and the
// landing site, and the favicons, launcher icons and splash screens are
// rebuilt from the same pixels — replacing the artwork means re-running
// this, never touching one of those files by hand, or the app ends up
// with logos that disagree.
//
// The field is keyed out by colour across the whole image rather than
// flooded in from the border: the letter counters (the holes in "A",
// "o" and "C") and the gap inside the arc are enclosed, and a flood
// leaves them as cream patches that do not match the page's cream.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(process.argv[2] ?? resolve(root, 'src/assets/brand/afrocoils-logo.png'))
const brand = resolve(root, 'src/assets/brand')
const res = resolve(root, 'android/app/src/main/res')

/** Light Cream, the page and the launcher background (`brand-cream`). */
const CREAM = { r: 0xe8, g: 0xd5, b: 0xc0, alpha: 1 }
/** Colour distance below which a pixel is field, and above which it is art. */
const KEY_IN = 28
const KEY_OUT = 90

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info

// The field colour is the median of the border, which is all field.
const border = []
for (let x = 0; x < W; x++) border.push(x, x + (H - 1) * W)
for (let y = 0; y < H; y++) border.push(y * W, y * W + W - 1)
const bg = [0, 1, 2].map((c) => {
  const v = border.map((p) => data[p * 4 + c]).sort((a, b) => a - b)
  return v[v.length >> 1]
})

for (let p = 0; p < W * H; p++) {
  const i = p * 4
  const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2])
  const a = Math.min(1, Math.max(0, (d - KEY_IN) / (KEY_OUT - KEY_IN)))
  // Anti-aliased edge pixels are part field: take the field back out of
  // their colour so they do not leave a pale fringe on a darker surface.
  if (a > 0 && a < 1)
    for (let c = 0; c < 3; c++)
      data[i + c] = Math.min(255, Math.max(0, Math.round((data[i + c] - bg[c] * (1 - a)) / a)))
  data[i + 3] = Math.round(a * (data[i + 3] ?? 255))
}

// The illustration and the wordmark are split at the first fully empty
// row below the middle — the logo always leaves one between them.
const rowEmpty = (y) => {
  for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 8) return false
  return true
}
let split = -1
for (let y = Math.floor(H * 0.5); y < H; y++)
  if (rowEmpty(y)) {
    split = y
    break
  }
if (split < 0) throw new Error('No empty row between the illustration and the wordmark.')

const keyed = () => sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
/** The art in rows [top, bottom), trimmed to what is not transparent. */
async function cut(top, bottom) {
  const region = await keyed()
    .extract({ left: 0, top, width: W, height: bottom - top })
    .png()
    .toBuffer()
  return sharp(region).trim({ threshold: 1 }).png().toBuffer()
}
const full = await cut(0, H)
const mark = await cut(0, split)
const word = await cut(split, H)

/** `art` contained in a `w`x`h` canvas at `scale` of it, on `background`. */
async function place(art, w, h, scale, background = { r: 0, g: 0, b: 0, alpha: 0 }) {
  const inner = await sharp(art)
    .resize(Math.round(w * scale), Math.round(h * scale), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3',
    })
    .png()
    .toBuffer()
  return sharp({ create: { width: w, height: h, channels: 4, background } })
    .composite([{ input: inner, gravity: 'centre' }])
}

const out = []
async function write(img, file) {
  mkdirSync(dirname(file), { recursive: true })
  await img.toFile(file)
  out.push(file.slice(root.length + 1))
}

// The app's three cuts. Sized for a 3x screen; enlarged when the source
// is smaller than that, which only softens — supply a larger original.
const webp = { quality: 92, alphaQuality: 100, effort: 6 }
await write(sharp(full).resize({ width: 1024, kernel: 'lanczos3' }).webp(webp), `${brand}/afro-hero.webp`)
await write((await place(mark, 256, 256, 1)).webp(webp), `${brand}/afro-mark.webp`)
await write(sharp(word).resize({ height: 160, kernel: 'lanczos3' }).webp(webp), `${brand}/afro-wordmark.webp`)

// Favicons: the illustration on cream, so it reads in a dark tab strip.
for (const s of [32, 180, 512])
  await write((await place(mark, s, s, s <= 32 ? 0.96 : 0.86, CREAM)).flatten({ background: CREAM }).png(), `${root}/public/favicon-${s}.png`)

// Launcher icons. Legacy squares are the favicon at density; the adaptive
// foreground keeps the art inside the 66dp safe zone of its 108dp canvas,
// over the cream declared in values/ic_launcher_background.xml.
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(densities)) {
  const legacy = Math.round(48 * k)
  for (const name of ['ic_launcher', 'ic_launcher_round'])
    await write((await place(mark, legacy, legacy, 0.86, CREAM)).flatten({ background: CREAM }).png(), `${res}/mipmap-${d}/${name}.png`)
  const fg = Math.round(108 * k)
  await write((await place(mark, fg, fg, 0.6)).png(), `${res}/mipmap-${d}/ic_launcher_foreground.png`)
}

// Splash screens: the whole logo, wordmark included, centred on cream.
const splashes = {
  drawable: [480, 320],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
}
for (const [dir, [w, h]] of Object.entries(splashes)) {
  const s = Math.round(Math.min(w, h) * 0.62)
  const logo = await (await place(full, s, s, 1)).png().toBuffer()
  await write(
    sharp({ create: { width: w, height: h, channels: 4, background: CREAM } })
      .composite([{ input: logo, gravity: 'centre' }])
      .flatten({ background: CREAM })
      .png(),
    `${res}/${dir}/splash.png`,
  )
}

console.log(`Source ${W}x${H}, field rgb(${bg.join(', ')}), split at row ${split}.`)
if (Math.max(W, H) < 1024)
  console.warn(`Warning: the source is ${W}x${H}; the splash screens and 512px favicon are enlarged from it. Re-run with a larger original.`)
console.log(out.map((f) => `  ${f}`).join('\n'))
