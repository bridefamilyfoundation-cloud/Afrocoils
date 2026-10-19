import { useSyncExternalStore } from 'react'
import { App } from '@capacitor/app'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { UpdateManifest } from './types'

/**
 * Telling an installed copy that a newer one has been posted.
 *
 * Afrocoil is installed from the landing site rather than a store, so
 * nothing else will ever tell anyone a new build exists. The site's
 * build publishes `latest.json` beside the APK; this reads it, compares
 * its `versionCode` with the installed one, and — when it is newer — the
 * prompt (`UpdatePrompt`) offers the download. Installing it is Android's
 * job and the user's decision: this never downloads or installs anything
 * by itself.
 *
 * **It is the app's second network request, and it carries nothing.** A
 * plain GET of a static file: no profile, no identifier, no body, no
 * query string. The host sees what any web server sees — an IP address
 * and a user agent — and the privacy policy says exactly that. It is on
 * by default and switched off on About. Any change that makes it send
 * something has to go through the privacy policy first.
 *
 * Offline is the normal case, not an error worth showing: a failed check
 * is silent on launch and only reported when the user asked for it.
 *
 * Native only. In a browser there is no APK to replace.
 */

const MANIFEST_URL = import.meta.env.VITE_UPDATE_MANIFEST_URL ?? ''

/** Whether this build can check at all: the APK, built with a manifest URL. */
export const updatesConfigured = Capacitor.isNativePlatform() && MANIFEST_URL.length > 0

/** A launch or a return within this long of the last check does not check again. */
const RECHECK_MS = 6 * 60 * 60 * 1000

export type InstalledVersion = { version: string; build: number }

export type AvailableUpdate = {
  version: string
  versionCode: number
  bytes: number
  sha256: string
  released: string
  notes: string[]
  /** Absolute. Opened in the system browser, which downloads it. */
  downloadUrl: string
  /** Absolute. The site's download section: checksum and install steps. */
  pageUrl: string
}

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current'; checkedAt: number }
  | { kind: 'available'; update: AvailableUpdate; checkedAt: number }
  /** Newer build exists, but it needs a newer Android than this phone runs. */
  | { kind: 'unsupported'; version: string; minAndroid: string; checkedAt: number }
  | { kind: 'failed'; checkedAt: number }

/* ------------------------------------------------------------------ *
 * A tiny store, so the prompt and the About screen see the same check.
 * ------------------------------------------------------------------ */

let status: UpdateStatus = { kind: 'idle' }
let lastChecked = 0
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function setStatus(next: UpdateStatus) {
  status = next
  listeners.forEach((listener) => listener())
}

export function useUpdateStatus(): UpdateStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => status,
  )
}

/* ------------------------------------------------------------------ *
 * Reading versions.
 * ------------------------------------------------------------------ */

let installed: Promise<InstalledVersion> | null = null

/** What is installed. `build` is the APK's versionCode — the number Android compares. */
export function installedVersion(): Promise<InstalledVersion> {
  installed ??= App.getInfo().then((info) => ({ version: info.version, build: Number(info.build) }))
  return installed
}

/** Refuses anything that is not the shape the site publishes, rather than half-trusting it. */
function parseManifest(data: unknown): UpdateManifest | null {
  const body = typeof data === 'string' ? safeJson(data) : data
  if (typeof body !== 'object' || body === null) return null
  const m = body as Record<string, unknown>
  const ok =
    typeof m.version === 'string' &&
    Number.isInteger(m.versionCode) &&
    typeof m.url === 'string' &&
    typeof m.page === 'string' &&
    typeof m.sha256 === 'string' &&
    /^[0-9a-f]{64}$/.test(m.sha256) &&
    typeof m.minAndroid === 'string'
  if (!ok) return null
  return {
    version: m.version as string,
    versionCode: m.versionCode as number,
    minSdk: Number(m.minSdk) || 0,
    minAndroid: m.minAndroid as string,
    bytes: Number(m.bytes) || 0,
    sha256: m.sha256 as string,
    released: typeof m.released === 'string' ? m.released : '',
    url: m.url as string,
    page: m.page as string,
    notes: Array.isArray(m.notes) ? m.notes.filter((n): n is string => typeof n === 'string') : [],
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * The Android release this phone runs, from the WebView's user agent —
 * "Android 13", "Android 7.1.2". Undefined when it cannot be read, in
 * which case the check gives the benefit of the doubt.
 */
function deviceAndroid(): number | undefined {
  const match = /Android (\d+(?:\.\d+)?)/.exec(navigator.userAgent)
  return match ? Number(match[1]) : undefined
}

/* ------------------------------------------------------------------ *
 * The check.
 * ------------------------------------------------------------------ */

/**
 * Look for a newer build.
 *
 * `force` is the user pressing "Check now": it skips the six-hour
 * spacing and is the only case where a failure is shown.
 *
 * Through `CapacitorHttp` rather than `fetch`: the request is made by
 * the native layer, so it does not depend on the site sending CORS
 * headers for a WebView origin it has never heard of. Static hosts do
 * not, by default, and a check that silently fails everywhere is worse
 * than none.
 */
export function checkForUpdates({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (!updatesConfigured) return Promise.resolve()
  if (inFlight) return inFlight
  if (!force && Date.now() - lastChecked < RECHECK_MS) return Promise.resolve()

  const previous = status
  if (force || previous.kind === 'idle') setStatus({ kind: 'checking' })

  inFlight = (async () => {
    try {
      const response = await CapacitorHttp.get({
        url: MANIFEST_URL,
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        connectTimeout: 8000,
        readTimeout: 8000,
      })
      const manifest = response.status === 200 ? parseManifest(response.data) : null
      if (!manifest) throw new Error(`Unusable manifest (${response.status})`)

      const { build } = await installedVersion()
      const checkedAt = Date.now()
      lastChecked = checkedAt

      if (!(manifest.versionCode > build)) {
        setStatus({ kind: 'current', checkedAt })
        return
      }

      const android = deviceAndroid()
      if (android !== undefined && android < Number.parseFloat(manifest.minAndroid)) {
        setStatus({ kind: 'unsupported', version: manifest.version, minAndroid: manifest.minAndroid, checkedAt })
        return
      }

      setStatus({
        kind: 'available',
        checkedAt,
        update: {
          version: manifest.version,
          versionCode: manifest.versionCode,
          bytes: manifest.bytes,
          sha256: manifest.sha256,
          released: manifest.released,
          notes: manifest.notes,
          downloadUrl: new URL(manifest.url, MANIFEST_URL).href,
          pageUrl: new URL(manifest.page, MANIFEST_URL).href,
        },
      })
    } catch {
      // No signal is the usual reason. Keep whatever was known before
      // (an update found an hour ago is still available) unless the user
      // asked, in which case they are owed an answer.
      setStatus(force || previous.kind === 'idle' || previous.kind === 'checking' ? { kind: 'failed', checkedAt: Date.now() } : previous)
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/** "7.1 MB", as the landing site writes it. */
export function formatBytes(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`
}
