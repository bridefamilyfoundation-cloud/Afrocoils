// Renders flyer.html with headless Edge (or Chrome) to ./out/afrocoils-launch-flyer.png (1080x1350).
// Usage: node marketing/launch-flyer/render.mjs
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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

const file = join(out, 'afrocoils-launch-flyer.png')
// A throwaway profile, so an Edge already open on this machine cannot hand back a cached page.
const profile = mkdtempSync(join(tmpdir(), 'afro-flyer-'))
execFileSync(browser, [
  `--user-data-dir=${profile}`,
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  '--force-device-scale-factor=1', '--window-size=1080,1350', '--virtual-time-budget=4000',
  `--screenshot=${file}`, pathToFileURL(join(here, 'flyer.html')).href,
], { stdio: 'inherit' })
rmSync(profile, { recursive: true, force: true })
console.log('Wrote', file)
