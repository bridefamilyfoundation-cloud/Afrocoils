/**
 * Captures the real screens the carousels are cut from.
 *
 * Needs the app's dev server (`npx vite --port 5199`) and playwright-core
 * resolvable (NODE_PATH), with a Chromium at CHROMIUM. A demo member's
 * profile is seeded into localStorage (where @capacitor/preferences keeps
 * it on the web) and every request that is not the dev server is aborted,
 * so nothing leaves the machine.
 *
 * Each screen is shot full page on a transparent background with the
 * fixed chrome hidden; the slide draws the wash behind it. marks.json
 * records where every heading and `data-tour` element really is, so a
 * slide's crop is placed from the screen rather than by eye.
 */
const { chromium } = require('playwright-core')
const fs = require('node:fs')
const path = require('node:path')

const ORIGIN = 'http://localhost:5199'
const OUT = path.join(__dirname, 'captures')
const now = Date.now()
const iso = (days) => new Date(now + days * 864e5).toISOString()

const BASE = {
  version: 12,
  bio: { name: 'Ama', climate: 'Humid / tropical', hardWater: true },
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
  lengthChecks: [
    { id: 'l1', dateISO: iso(-150), overall: 6 },
    { id: 'l2', dateISO: iso(-120), overall: 6.4 },
    { id: 'l3', dateISO: iso(-90), overall: 6.9 },
    { id: 'l4', dateISO: iso(-60), overall: 7.3 },
    { id: 'l5', dateISO: iso(-30), overall: 7.8 },
    { id: 'l6', dateISO: iso(-1), overall: 8.2 },
  ],
  savedStyles: [],
  savedProducts: [],
  myStyles: [
    {
      id: 'm1',
      name: 'Two-strand twists',
      minutes: 45,
      photos: [],
      wornISO: [iso(-40), iso(-12)],
      favourite: true,
      createdISO: iso(-40),
    },
  ],
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
  createdISO: iso(-160),
  updatedISO: iso(0),
}

const LOOSE = {
  ...BASE,
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
}

const LOCS = {
  ...BASE,
  identity: {
    hairType: 'Locs',
    curlPattern: '4C',
    curlPatterns: ['4C'],
    porosity: 'High',
    density: 'High',
    texture: 'Fine',
    scalpCondition: 'Dry',
    locType: 'Traditional',
    locMethod: 'Two-strand twists',
    locStartISO: iso(-420).slice(0, 10),
  },
}

const CAP = 5200

const SHOTS = [
  ['loose', 'sos', '/sos'],
  ['loose', 'quick', '/sos/quick'],
  ['loose', 'styles', '/styles'],
  ['loose', 'recommended', '/styles/recommended'],
  ['loose', 'care', '/care'],
  ['loose', 'guide', '/care/guide'],
  ['loose', 'learn', '/care/learn'],
  ['loose', 'calendar', '/calendar'],
  ['loose', 'products', '/products'],
  ['loose', 'growth', '/growth'],
  ['loose', 'profile', '/profile'],
  ['loose', 'quiz', '/quiz'],
  ['locs', 'locs', '/locs'],
  ['locs', 'locstyles', '/locs/styles'],
]

const HIDE_CHROME = `*{transition:none!important;animation:none!important}.app-chrome{visibility:hidden!important}.page-wash{display:none!important}html,body,#root{background:transparent!important}`

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const only = process.argv.slice(2)
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM })
  const marksFile = path.join(OUT, 'marks.json')
  const marks = fs.existsSync(marksFile) ? JSON.parse(fs.readFileSync(marksFile, 'utf8')) : {}

  for (const who of ['loose', 'locs']) {
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
    }, JSON.stringify(who === 'loose' ? LOOSE : LOCS))
    const page = await context.newPage()

    for (const [profile, name, route] of SHOTS) {
      if (profile !== who || (only.length && !only.includes(name))) continue
      // The loc lookbook is eighteen plates of three pictures: walking and
      // decoding all of it stalls Chromium, so it is shot as one tall
      // viewport from the top instead.
      const tall = name === 'locstyles'
      await page.setViewportSize({ width: 412, height: tall ? 3200 : 915 })
      await page.goto(`${ORIGIN}/#${route}`)
      await page.waitForTimeout(tall ? 5000 : 1500)
      if (!tall) {
        await page.evaluate(async () => {
          await document.fonts.ready
          // Lazy pictures only load near the viewport: walk the page once.
          for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
            scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 120))
          }
          scrollTo(0, 0)
          await Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
        })
      }
      await page.waitForTimeout(600)
      await page.addStyleTag({ content: HIDE_CHROME })
      await page.waitForTimeout(200)
      marks[name] = await page.evaluate(() => ({
        url: location.hash,
        height: document.documentElement.scrollHeight,
        marks: [...document.querySelectorAll('main h1, main h2, main h3, main h4, [data-tour], main section, main a, main button')]
          .map((el) => {
            const r = el.getBoundingClientRect()
            return {
              tag: el.tagName.toLowerCase(),
              tour: el.getAttribute('data-tour') || undefined,
              text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 90),
              y: Math.round(r.top + scrollY),
              h: Math.round(r.height),
            }
          })
          .filter((m) => m.h > 0 && (m.tag.startsWith('h') || m.tour || m.tag === 'section')),
      }))
      // A very long screen (the loc lookbook) is cut at CAP: the slides only
      // ever crop from the top of it, and Chromium stalls on the whole thing.
      await page.screenshot({
        path: path.join(OUT, `${name}.png`),
        fullPage: !tall,
        clip: { x: 0, y: 0, width: 412, height: tall ? 3200 : Math.min(marks[name].height, CAP) },
        omitBackground: true,
      })
      fs.writeFileSync(marksFile, JSON.stringify(marks, null, 2))
      console.log(name, marks[name].url, marks[name].height)
    }
    await context.close()
  }
  fs.writeFileSync(marksFile, JSON.stringify(marks, null, 2))
  await browser.close()
})()
