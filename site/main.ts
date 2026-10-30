/**
 * The landing page's behaviour: the scroll story, the phone mockups, the
 * reveal animations, the Ask demo, and the QR code.
 *
 * Everything here is progressive. With scripts off the page is complete —
 * every section visible, the download link in the HTML — and
 * what is lost is motion and the mockups, which are decorative.
 */
import QRCode from 'qrcode'
import heroUrl from '../src/assets/brand/afro-hero.webp'
import markUrl from '../src/assets/brand/afro-mark.webp'
import wordmarkUrl from '../src/assets/brand/afro-wordmark.webp'
import { askDemo, bands } from 'virtual:site-facts'

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
  root.querySelector<T & Element>(selector) as T

/* ------------------------------------------------------------------ *
 * Nav: gains a surface once the page has moved.
 * ------------------------------------------------------------------ */
const nav = $('#nav')
const onScroll = () => {
  const scrolled = scrollY > 12
  for (const name of ['bg-background/85', 'backdrop-blur-md', 'shadow-sm']) nav.classList.toggle(name, scrolled)
}
addEventListener('scroll', onScroll, { passive: true })
onScroll()

/* ------------------------------------------------------------------ *
 * Phone screens, built from <template id="screens">: once into the
 * sticky phone, and once into each step for screens too narrow for it.
 * ------------------------------------------------------------------ */
const template = $<HTMLTemplateElement>('#screens').content
const SCREENS = ['front', 'doors', 'quick', 'care', 'growth', 'profile'] as const
type ScreenName = (typeof SCREENS)[number]

function buildScreen(name: ScreenName): HTMLElement {
  const screen = $(`[data-screen="${name}"]`, template).cloneNode(true) as HTMLElement

  screen.querySelectorAll('[data-appbar]').forEach((slot) => {
    slot.replaceWith($('[data-appbar-source]', template).cloneNode(true))
  })

  const navSlot = $('[data-nav]', screen)
  const lit = Number(navSlot.dataset.nav)
  const bar = $('[data-navbar]', template).cloneNode(true) as HTMLElement
  ;[...bar.firstElementChild!.children].forEach((tab, i) => {
    if (i === lit) tab.classList.add('bg-secondary', 'px-3', 'text-on-secondary')
    else {
      tab.classList.add('w-9', 'text-inverse-on-surface/75')
      tab.querySelector('[data-label]')?.remove()
    }
  })
  // The Ask button floats above the tab bar's right end on every screen.
  navSlot.replaceWith($('[data-ask-source]', template).cloneNode(true), bar)

  screen.querySelectorAll<HTMLImageElement>('img[data-brand]').forEach((img) => {
    const brand = img.dataset.brand
    img.src = brand === 'hero' ? heroUrl : brand === 'wordmark' ? wordmarkUrl : markUrl
  })
  if (name === 'quick') setupQuick(screen)
  return screen
}

/* Quick Hairstyle: real library entries per time band (vite.site.config.ts),
   cycling while the screen is in view. */
function renderBand(screen: HTMLElement, index: number) {
  $('[data-bands]', screen).innerHTML = bands
    .map(
      (band, i) =>
        `<span class="whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
          i === index ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
        }">${band.label}</span>`,
    )
    .join('')
  $('[data-band-list]', screen).innerHTML = bands[index].styles
    .map(
      (style, k) => `
      <div class="overflow-hidden rounded-xl bg-surface-container-lowest" style="animation: rise .5s ${k * 70}ms cubic-bezier(.2,.7,.2,1) both">
        <div class="tile aspect-[4/5]"></div>
        <div class="p-2"><p class="truncate text-[11.5px] font-semibold text-on-surface">${style.name}</p><p class="text-[10px] text-on-surface-variant">${style.minutes} min</p></div>
      </div>`,
    )
    .join('')
}

function setupQuick(screen: HTMLElement) {
  let index = 0
  renderBand(screen, index)
  if (reduceMotion) return
  setInterval(() => {
    if (screen.classList.contains('is-active') && !document.hidden) renderBand(screen, (index = (index + 1) % bands.length))
  }, 2600)
}

function fillMeter(screen: HTMLElement, on: boolean) {
  const meter = screen.querySelector<HTMLElement>('[data-meter]')
  if (!meter) return
  meter.style.width = on ? '80%' : '0'
  $('[data-meter-label]', screen).textContent = on ? '80%' : '0%'
}

const phone = $('#phone')
const dots = $('#phone-dots')
const steps = [...document.querySelectorAll<HTMLElement>('[data-step]')]

for (const name of SCREENS) {
  phone.append(buildScreen(name))

  const dot = document.createElement('span')
  dot.className = 'h-1.5 w-1.5 rounded-full bg-outline-variant transition-all duration-300'
  dot.dataset.dot = name
  dots.append(dot)

  const slot = document.querySelector(`[data-slot="${name}"]`)
  if (slot) {
    const frame = document.createElement('div')
    frame.className = 'mx-auto w-[280px] max-w-full rounded-[40px] bg-brand-espresso p-[10px] shadow-2xl shadow-brand-chocolate/30'
    frame.setAttribute('aria-hidden', 'true')
    const inner = document.createElement('div')
    inner.className = 'relative h-[540px] overflow-hidden rounded-[32px] bg-background'
    const screen = buildScreen(name)
    screen.dataset.mini = ''
    inner.append(screen)
    frame.append(inner)
    slot.append(frame)
  }
}

/* The small phones animate as they scroll into view, the way the sticky
   one does when its step becomes current. */
const miniObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      const screen = entry.target as HTMLElement
      screen.classList.toggle('is-active', entry.isIntersecting)
      fillMeter(screen, entry.isIntersecting)
    }),
  { threshold: 0.4 },
)
document.querySelectorAll<HTMLElement>('[data-mini]').forEach((screen) => miniObserver.observe(screen))

/* ------------------------------------------------------------------ *
 * The story: whichever step crosses the middle of the viewport drives
 * the sticky phone.
 * ------------------------------------------------------------------ */
function activate(name: string) {
  steps.forEach((step) => step.classList.toggle('is-active', step.dataset.step === name))
  phone.querySelectorAll<HTMLElement>('.screen').forEach((screen) => {
    const on = screen.dataset.screen === name
    screen.classList.toggle('is-active', on)
    fillMeter(screen, on)
  })
  dots.querySelectorAll<HTMLElement>('[data-dot]').forEach((dot) => {
    const on = dot.dataset.dot === name
    dot.classList.toggle('w-6', on)
    dot.classList.toggle('bg-secondary', on)
    dot.classList.toggle('bg-outline-variant', !on)
  })
}
const storyObserver = new IntersectionObserver(
  (entries) => entries.forEach((entry) => entry.isIntersecting && activate((entry.target as HTMLElement).dataset.step!)),
  { rootMargin: '-45% 0px -45% 0px' },
)
steps.forEach((step) => storyObserver.observe(step))
activate('front')

/* ------------------------------------------------------------------ *
 * Reveal on scroll, count-up, the privacy flow line.
 * ------------------------------------------------------------------ */
function countUp(el: HTMLElement) {
  const to = Number(el.textContent)
  if (reduceMotion || !Number.isFinite(to)) return
  const start = performance.now()
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / 1400)
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

const revealObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const el = entry.target as HTMLElement
      el.classList.add('is-in')
      revealObserver.unobserve(el)
      el.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp)
      const fill = el.querySelector<HTMLElement>('#flow-fill')
      if (fill) fill.style.height = '100%'
      // Below lg the steps are not driven by the story, so light the bar on arrival.
      el.querySelectorAll('.step-bar').forEach((bar) => bar.classList.add('is-in'))
    }),
  { threshold: 0.18 },
)
document.querySelectorAll('[data-reveal], [data-step]').forEach((el) => revealObserver.observe(el))

/* ------------------------------------------------------------------ *
 * Ask, replayed: the question is typed, sent, and answered with the
 * Quick Hair Check card, word for word, on a loop while it is in view.
 * Text goes in through textContent; the content is ours, but the card
 * should never be the place that starts trusting it as HTML.
 * ------------------------------------------------------------------ */
const askBox = document.querySelector<HTMLElement>('#ask-demo')
if (askBox) {
  askBox.classList.remove('hidden')
  const typed = $('[data-ask-typed]', askBox)
  const caret = $('[data-ask-caret]', askBox)
  const placeholder = $('[data-ask-placeholder]', askBox)
  const send = $('[data-ask-send]', askBox)
  const askSteps = [...askBox.querySelectorAll<HTMLElement>('[data-ask-step]')]
  $('[data-ask-bubble]', askBox).textContent = askDemo.question
  $('[data-ask-title]', askBox).textContent = askDemo.title
  $('[data-ask-problem]', askBox).textContent = askDemo.problem
  $('[data-ask-more]', askBox).textContent = askDemo.more ? `and ${askDemo.more} more on the page` : ''
  const list = $('[data-ask-solutions]', askBox)
  for (const line of askDemo.solutions) {
    const li = document.createElement('li')
    li.className = 'ask-tick flex gap-sm font-body-md text-[13.5px] text-on-surface'
    li.innerHTML = '<svg class="mt-0.5 h-4 w-4 shrink-0 text-secondary" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><use href="#i-check" /></svg><span></span>'
    li.lastElementChild!.textContent = line
    list.append(li)
  }
  const ticks = [...list.children] as HTMLElement[]

  const showAnswer = (on: boolean) => {
    askSteps.forEach((el) => el.classList.toggle('is-on', on))
    ticks.forEach((el) => el.classList.toggle('is-on', on))
  }
  const setTyped = (text: string) => {
    typed.textContent = text
    placeholder.hidden = text.length > 0
  }

  if (reduceMotion) {
    caret.hidden = true
    setTyped(askDemo.question)
    showAnswer(true)
  } else {
    let visible = false
    let run = 0
    const wait = (ms: number, id: number) =>
      new Promise<boolean>((done) => setTimeout(() => done(id === run && visible && !document.hidden), ms))

    // One pass: type, send, answer, hold, clear. A new pass cancels the old one.
    const play = async () => {
      const id = ++run
      showAnswer(false)
      setTyped('')
      caret.hidden = false
      if (!(await wait(700, id))) return
      for (let i = 1; i <= askDemo.question.length; i++) {
        setTyped(askDemo.question.slice(0, i))
        if (!(await wait(55 + (i % 4 === 0 ? 40 : 0), id))) return
      }
      if (!(await wait(450, id))) return
      caret.hidden = true
      send.style.transform = 'scale(0.86)'
      if (!(await wait(160, id))) return
      send.style.transform = ''
      askSteps[0].classList.add('is-on')
      if (!(await wait(450, id))) return
      askSteps[1].classList.add('is-on')
      for (const tick of ticks) {
        if (!(await wait(260, id))) return
        tick.classList.add('is-on')
      }
      if (!(await wait(6500, id))) return
      showAnswer(false)
      if (!(await wait(600, id))) return
      play()
    }

    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) play()
        else run++
      },
      { threshold: 0.35 },
    ).observe(askBox)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) run++
      else if (visible) play()
    })
  }
}

/* ------------------------------------------------------------------ *
 * QR code to this page's download section, for someone on a computer.
 * Built from the page's own address so it is right wherever it is
 * hosted — and not shown at all when that address is not one a phone
 * can reach.
 * ------------------------------------------------------------------ */
const here = new URL(location.href)
if (/^https?:$/.test(here.protocol) && !['localhost', '127.0.0.1'].includes(here.hostname)) {
  here.hash = 'download'
  const qr = $('#qr')
  // The ink is the element's own text colour (a token), as hex for the encoder.
  const ink = `#${(getComputedStyle(qr).color.match(/\d+/g) ?? ['0', '0', '0'])
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('')}`
  QRCode.toString(here.href, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: ink, light: '#0000' } })
    .then((svg) => {
      qr.innerHTML = svg
      // Still hidden on phones: a QR code is for reaching a phone from elsewhere.
      $('#qr-block').classList.add('md:block')
    })
    .catch(() => {})
}
