/**
 * Captures the real Hair SOS screens for the how-to video.
 *
 * Needs the app's dev server (`npx vite --port 5199`) and playwright-core
 * resolvable (NODE_PATH), with a Chromium at CHROMIUM. A demo member's
 * profile is seeded into localStorage (where @capacitor/preferences keeps
 * it on the web) and every request that is not the dev server is aborted,
 * so nothing leaves the machine.
 *
 * Each screen's content and its fixed chrome (app bar, tab bar, Ask) are
 * shot separately on transparent backgrounds; the video draws the wash
 * and scrolls the content under the chrome. marks.json records where
 * every control the video taps really is, so the tap ring is placed from
 * the screen rather than by eye: content controls in page coordinates,
 * chrome controls in viewport coordinates.
 */
const { chromium } = require('playwright-core')
const fs = require('node:fs')
const path = require('node:path')

const ORIGIN = 'http://localhost:5199'
const OUT = path.join(__dirname, 'captures')
const now = Date.now()
const iso = (days) => new Date(now + days * 864e5).toISOString()

const PROFILE = {
  version: 12,
  bio: { name: 'Ama', climate: 'Humid / tropical', hardWater: true },
  identity: {
    hairType: 'Loose Natural',
    curlPattern: '4C',
    curlPatterns: ['4C', '4B'],
    porosity: 'High',
    density: 'High',
    texture: 'Fine',
    scalpCondition: 'Dry',
    scalpConcerns: ['Itching'],
  },
  state: { condition: 'Dry', concerns: ['Dryness', 'Length retention'] },
  preferences: {
    heatlessOnly: true,
    siliconeFree: false,
    proteinSensitive: true,
    protectiveBias: true,
    lowManipulation: true,
  },
  shelf: [],
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

const HIDE_CHROME = `*{transition:none!important}.app-chrome{visibility:hidden!important}.page-wash{display:none!important}html,body,#root{background:transparent!important}`
const ONLY_CHROME = `*{transition:none!important}body *{visibility:hidden!important}.app-chrome,.app-chrome *{visibility:visible!important}.page-wash{display:none!important}html,body,#root{background:transparent!important}`

async function content(page, name) {
  await page.evaluate(() => scrollTo(0, 0))
  const style = await page.addStyleTag({ content: HIDE_CHROME })
  await page.waitForTimeout(200)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true, omitBackground: true })
  await style.evaluate((el) => el.remove())
  return page.evaluate(() => document.documentElement.scrollHeight)
}

async function chrome(page, name) {
  const style = await page.addStyleTag({ content: ONLY_CHROME })
  await page.waitForTimeout(200)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), omitBackground: true })
  await style.evaluate((el) => el.remove())
}

/** Where a control is: page coordinates for content, viewport for chrome. */
async function box(page, locator) {
  await page.evaluate(() => scrollTo(0, 0))
  const b = await locator.first().boundingBox()
  if (!b) throw new Error('control not found')
  return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM })
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
  }, JSON.stringify(PROFILE))
  const page = await context.newPage()
  const settle = async () => {
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
    })
    await page.waitForTimeout(700)
  }
  const marks = {}

  /* The front page. */
  await page.goto(`${ORIGIN}/#/sos`)
  await page.getByRole('heading', { name: /your emergency/ }).waitFor()
  await settle()
  marks.sos = {
    height: await content(page, 'sos'),
    getStarted: await box(page, page.getByRole('link', { name: 'Get Started' })),
    quickLink: await box(page, page.getByRole('button', { name: 'Need a quick style?' })),
    twoWays: await box(page, page.getByRole('heading', { name: 'Two ways in' })),
    doorQuick: await box(page, page.getByRole('link', { name: /Quick Hairstyle/ })),
    doorCare: await box(page, page.locator('[data-tour="sos-doors"] a[href$="/care"]')),
  }
  // Where "Need a quick style?" really lands: tap it and read the scroll.
  await page.getByRole('button', { name: 'Need a quick style?' }).click()
  await page.waitForTimeout(1200)
  marks.sos.doorsScroll = await page.evaluate(() => Math.round(scrollY))
  await chrome(page, 'chrome-sos')
  marks.tabSos = await box(page, page.locator('[data-tour="tab-bar"] a[aria-label="SOS"]'))

  /* Quick Hairstyle: as it opens, then with the second time picked. */
  await page.evaluate(() => scrollTo(0, 0))
  await page.getByRole('link', { name: /Quick Hairstyle/ }).click()
  await page.getByRole('heading', { name: 'Quick Hairstyle' }).waitFor()
  await settle()
  const bands = page.locator('button[aria-pressed]')
  marks.quick = {
    height0: await content(page, 'quick0'),
    bands: await bands.allInnerTexts(),
    band: await box(page, bands.nth(1)),
    count0: await page.getByText(/styles? fits? /).innerText().catch(() => null),
  }
  await chrome(page, 'chrome-quick')
  marks.tabSosInQuick = await box(page, page.locator('[data-tour="tab-bar"] a[aria-label="SOS"]'))
  marks.tabLitInQuick = await page.locator('[data-tour="tab-bar"] a[aria-label="SOS"]').getAttribute('aria-current')
  await bands.nth(1).click()
  await settle()
  marks.quick.height1 = await content(page, 'quick1')
  marks.quick.picked = await bands.nth(1).innerText()
  marks.quick.count1 = await page.getByText(/styles? fits? /).innerText().catch(() => null)
  marks.quick.url = page.url()

  /* Back with the SOS tab, then Get Started. */
  await page.locator('[data-tour="tab-bar"] a[aria-label="SOS"]').click()
  await page.getByRole('heading', { name: /your emergency/ }).waitFor()
  marks.backUrl = page.url()
  await page.getByRole('link', { name: 'Get Started' }).click()
  await page.waitForURL(/#\/care$/)
  await settle()
  marks.care = {
    url: page.url(),
    height: await content(page, 'care'),
    heading: await page.locator('main h2').first().innerText(),
    wrong: await box(page, page.getByRole('link', { name: /Something is wrong/ })),
  }
  await chrome(page, 'chrome-care')

  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(marks, null, 2))
  await browser.close()
  console.log(JSON.stringify(marks, null, 2))
})()
