/**
 * Renders index.html (Hair SOS) to an MP4: steps window.seek() one frame at a time,
 * screenshots each, and hands the frames to ffmpeg.
 *
 *   NODE_PATH=<dir with playwright-core>/node_modules \
 *   CHROMIUM=<chrome.exe> node render.cjs [--frames-dir <dir>] [--stills 2,6,11]
 *
 * --stills writes only those seconds as PNGs (for checking a beat)
 * instead of the whole film.
 */
const { chromium } = require('playwright-core')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const FPS = 30
const arg = (name) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}
const frames = arg('--frames-dir') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'afrocoils-sos-'))
const stills = arg('--stills')?.split(',').map(Number)
const out = path.join(__dirname, 'afrocoils-hair-sos.mp4')

;(async () => {
  fs.mkdirSync(frames, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM })
  const context = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  // The page is local files only; refuse anything else outright.
  await context.route('**/*', (route) => (route.request().url().startsWith('file:') ? route.continue() : route.abort()))
  const page = await context.newPage()
  await page.goto(`${pathToFileURL(path.join(__dirname, 'index.html'))}?render`)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((img) => img.decode()))
  })
  const duration = await page.evaluate(() => window.DURATION)
  const shot = async (t, file) => {
    await page.evaluate((s) => window.seek(s), t)
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1920 } })
  }

  if (stills) {
    for (const t of stills) await shot(t, path.join(frames, `still-${String(t).replace('.', '_')}.png`))
    await browser.close()
    console.log('stills in', frames)
    return
  }

  const total = Math.round(duration * FPS)
  for (let f = 0; f < total; f++) {
    const file = path.join(frames, `f${String(f).padStart(5, '0')}.png`)
    // A frame already on disk is kept, so an interrupted render picks up where it stopped.
    if (!fs.existsSync(file)) await shot(f / FPS, file)
    if (f % 150 === 0) console.log(`frame ${f}/${total}`)
  }
  await browser.close()

  const encode = spawnSync(
    'ffmpeg',
    ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', '-an', out],
    { stdio: 'inherit' },
  )
  if (encode.status !== 0) process.exit(encode.status ?? 1)
  console.log('wrote', out)
})()
