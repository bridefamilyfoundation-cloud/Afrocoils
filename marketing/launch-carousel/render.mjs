// Renders carousel.html with headless Edge (or Chrome) and slices the
// 8640x1350 strip into eight 1080x1350 PNGs in ./out, plus a preview.
// Usage: node marketing/launch-carousel/render.mjs
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out')
mkdirSync(out, { recursive: true })

const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
]
const browser = browsers.find(existsSync)
if (!browser) throw new Error('No Edge or Chrome found')

const strip = join(out, 'strip.png')
execFileSync(browser, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  '--force-device-scale-factor=1', '--window-size=8640,1350', '--virtual-time-budget=4000',
  `--screenshot=${strip}`, pathToFileURL(join(here, 'carousel.html')).href,
], { stdio: 'inherit' })

for (let i = 0; i < 8; i++) {
  await sharp(strip).extract({ left: i * 1080, top: 0, width: 1080, height: 1350 })
    .png().toFile(join(out, `afrocoils-launch-${i + 1}.png`))
}
await sharp(strip).resize(2880).png().toFile(join(out, 'preview.png'))
console.log('Wrote 8 slides to', out)
