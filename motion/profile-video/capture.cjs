/**
 * Captures the real My Hair Profile screen for the motion video.
 *
 * Needs the app's dev server (`npx vite --port 5199`) and playwright-core
 * resolvable (NODE_PATH), with a Chromium at CHROMIUM. A demo profile is
 * seeded into localStorage (where @capacitor/preferences keeps it on the
 * web) and every request that is not the dev server is aborted, so
 * nothing leaves the machine.
 *
 * The page content and the fixed chrome (app bar, tab bar, Ask) are shot
 * separately on transparent backgrounds; the video draws the wash itself
 * and scrolls the content under the chrome.
 */
const { chromium } = require('playwright-core')
const fs = require('node:fs')
const path = require('node:path')

const ORIGIN = 'http://localhost:5199'
const OUT = path.join(__dirname, 'captures')
const now = Date.now()
const iso = (days) => new Date(now + days * 864e5).toISOString()

function profile(partial) {
  return {
    version: 12,
    bio: { name: 'Ama', climate: 'Humid / tropical', hardWater: true },
    identity: partial
      ? { hairType: 'Loose Natural', curlPattern: '4C', curlPatterns: ['4C', '4B'], porosity: 'High' }
      : {
          hairType: 'Loose Natural',
          curlPattern: '4C',
          curlPatterns: ['4C', '4B'],
          porosity: 'High',
          density: 'High',
          texture: 'Fine',
          scalpCondition: 'Dry',
          scalpConcerns: ['Itching'],
        },
    state: partial ? {} : { condition: 'Dry', concerns: ['Dryness', 'Length retention'] },
    preferences: {
      heatlessOnly: true,
      siliconeFree: false,
      proteinSensitive: true,
      protectiveBias: true,
      lowManipulation: true,
    },
    shelf: [
      { id: 'demo-leave-in', name: 'Creamy leave-in', role: 'Moisture base', inUse: true },
      { id: 'demo-oil', name: 'Sealing oil', role: 'Seals the leave-in', inUse: true },
      { id: 'demo-mask', name: 'Deep conditioning mask', role: 'Wash day treatment', inUse: false },
    ],
    lengthUnit: 'in',
    lengthChecks: [],
    savedStyles: [],
    savedProducts: [],
    myStyles: [],
    careEvents: [],
    schedules: [],
    submissions: [],
    updates: { check: false },
    askSharing: false,
    tourSeenISO: iso(-10),
    membership: {
      email: 'ama@example.com',
      token: 'demo',
      status: 'active',
      paidUntilISO: iso(200),
      plan: 'annual',
      periodStartISO: iso(-100),
      trialEndsISO: null,
      renews: true,
      card: true,
      checkedISO: iso(0),
    },
    createdISO: iso(-100),
    updatedISO: iso(0),
  }
}

const HIDE_CHROME = `*{transition:none!important}.app-chrome{visibility:hidden!important}.page-wash{display:none!important}html,body,#root{background:transparent!important}`
const ONLY_CHROME = `*{transition:none!important}body *{visibility:hidden!important}.app-chrome,.app-chrome *{visibility:visible!important}.page-wash{display:none!important}html,body,#root{background:transparent!important}`

async function open(browser, doc, hash) {
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    reducedMotion: 'reduce',
  })
  await context.route('**/*', (route) =>
    route.request().url().startsWith(ORIGIN) ? route.continue() : route.abort(),
  )
  await context.addInitScript((value) => {
    localStorage.setItem('CapacitorStorage.hair-profile:v1', value)
  }, JSON.stringify(doc))
  const page = await context.newPage()
  await page.goto(`${ORIGIN}/#${hash}`)
  await page.getByRole('heading', { name: 'My Hair Profile' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)
  return { context, page }
}

async function shootContent(page, name) {
  const style = await page.addStyleTag({ content: HIDE_CHROME })
  await page.waitForTimeout(150)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true, omitBackground: true })
  const marks = await page.evaluate(() => {
    const out = { height: document.documentElement.scrollHeight }
    for (const el of document.querySelectorAll('[id^="profile-"], section[aria-label], main section')) {
      const r = el.getBoundingClientRect()
      const key = el.id || el.getAttribute('aria-label') || el.querySelector('h3,h2')?.textContent
      if (key && !(key in out)) out[key] = { y: Math.round(r.top + scrollY), h: Math.round(r.height) }
    }
    return out
  })
  await style.evaluate((el) => el.remove())
  return marks
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM })
  const marks = {}

  // The filled-in profile: closed, then with two rows open in turn.
  let { context, page } = await open(browser, profile(false), '/profile')
  marks.full = await shootContent(page, 'full')
  const chrome = await page.addStyleTag({ content: ONLY_CHROME })
  await page.waitForTimeout(150)
  await page.screenshot({ path: path.join(OUT, 'chrome.png'), omitBackground: true })
  await chrome.evaluate((el) => el.remove())

  await page.getByRole('button', { name: /^Climate/ }).click()
  await page.waitForTimeout(200)
  marks.climate = await shootContent(page, 'climate')
  await page.getByRole('button', { name: /^Strict rules/ }).click()
  await page.waitForTimeout(200)
  marks.rules = await shootContent(page, 'rules')
  await context.close()

  // A half-answered profile, for the meter and "Still to add".
  ;({ context, page } = await open(browser, profile(true), '/profile'))
  marks.partial = await shootContent(page, 'partial')
  await context.close()

  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(marks, null, 2))
  await browser.close()
  console.log('captured', Object.keys(marks).join(', '))
})()
