/**
 * Renders every slide in data.js to ../<slug>/slide-NN.png (1080x1350)
 * and a contact sheet of each set. `node render.cjs sos locs` renders
 * only those sections.
 *
 * Needs playwright-core resolvable (NODE_PATH), a Chromium at CHROMIUM
 * and ffmpeg on PATH for the contact sheets. No server: the template is
 * opened from disk.
 */
const { chromium } = require('playwright-core')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { pathToFileURL } = require('node:url')

const sandbox = {}
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8') + ';this.CAROUSELS = CAROUSELS', sandbox)
const only = process.argv.slice(2)

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM })
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
  const template = pathToFileURL(path.join(__dirname, 'index.html')).href
  for (const section of sandbox.CAROUSELS) {
    if (only.length && !only.includes(section.slug)) continue
    const out = path.join(__dirname, '..', section.slug)
    fs.mkdirSync(out, { recursive: true })
    const files = []
    for (let i = 1; i <= section.slides.length; i++) {
      await page.goto(`${template}?section=${section.slug}&slide=${i}`)
      await page.evaluate(() => window.ready)
      await page.waitForTimeout(150)
      const file = path.join(out, `slide-${String(i).padStart(2, '0')}.png`)
      await page.screenshot({ path: file })
      files.push(file)
    }
    execFileSync('ffmpeg', [
      '-v', 'error', '-y',
      ...files.flatMap((f) => ['-i', f]),
      '-filter_complex',
      `${files.map((_, i) => `[${i}:v]scale=360:-1[s${i}]`).join(';')};${files.map((_, i) => `[s${i}]`).join('')}hstack=inputs=${files.length}`,
      '-frames:v', '1', path.join(out, 'contact-sheet.png'),
    ])
    console.log(section.slug, files.length)
  }
  await browser.close()
})()
