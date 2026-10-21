import { useSyncExternalStore } from 'react'
import { App } from '@capacitor/app'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import type { BundleRelease, UpdateManifest } from './types'

/**
 * Telling an installed copy that something newer has been posted.
 *
 * AfroCoils is installed from the landing site rather than a store, so
 * nothing else will ever tell anyone an update exists. `latest.json`, in
 * the public `releases` bucket, names two kinds:
 *
 * - **A new APK** (`versionCode` above the installed one). Needed for
 *   anything native — a plugin, a permission, the icon. The prompt opens
 *   the download in the browser; Android installs it over this one.
 * - **A pushed update** (`bundle`, code above `__BUNDLE_CODE__`). New
 *   screens and content, swapped in without reinstalling: the APK's
 *   version, package id and signature are untouched. The prompt downloads
 *   the zip, the updater checks it against the manifest's SHA-256, and
 *   the app reloads into it.
 *
 * Neither happens by itself. This only finds out; the user taps.
 *
 * **It is the app's second network request, and it carries nothing.** A
 * plain GET of a static file: no profile, no identifier, no body, no
 * query string. The host sees what any web server sees — an IP address
 * and a user agent — and the privacy policy says exactly that. Fetching
 * a pushed update is a GET of a static zip, likewise. It is on by
 * default and switched off on About. Any change that makes either send
 * something has to go through the privacy policy first.
 *
 * Offline is the normal case, not an error worth showing: a failed check
 * is silent on launch and only reported when the user asked for it.
 *
 * Native only. In a browser there is no APK to replace and the page is
 * always the newest bundle anyway.
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

/** A pushed update this copy can take without reinstalling. */
export type PushedUpdate = {
  code: number
  bytes: number
  sha256: string
  released: string
  notes: string[]
  /** Absolute. The zip, fetched by the updater rather than the browser. */
  url: string
}

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current'; checkedAt: number }
  | { kind: 'available'; update: AvailableUpdate; checkedAt: number }
  | { kind: 'pushed'; push: PushedUpdate; checkedAt: number }
  /** Downloading and verifying. On success the app reloads, so there is no "done". */
  | { kind: 'installing'; push: PushedUpdate; percent: number }
  | { kind: 'install-failed'; push: PushedUpdate; checkedAt: number }
  /** Newer build exists, but it needs a newer Android than this phone runs. */
  | { kind: 'unsupported'; version: string; minAndroid: string; checkedAt: number }
  | { kind: 'failed'; checkedAt: number }

/** The pushed update this copy is running: 0 for the APK's own bundle when none has been pushed. */
export const RUNNING_BUNDLE = __BUNDLE_CODE__

/** Whether this build can take pushed updates: the plugin is in the APK it is running in. */
const pushCapable = updatesConfigured && Capacitor.isPluginAvailable('CapacitorUpdater')

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
    notes: stringList(m.notes),
    bundle: parseBundle(m.bundle),
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((n): n is string => typeof n === 'string') : []
}

/**
 * A malformed `bundle` is dropped, not half-trusted: it is code the app
 * would run, and the SHA-256 is what the updater checks the zip against.
 */
function parseBundle(value: unknown): BundleRelease | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const b = value as Record<string, unknown>
  const ok =
    Number.isInteger(b.code) &&
    Number.isInteger(b.minVersionCode) &&
    typeof b.url === 'string' &&
    typeof b.sha256 === 'string' &&
    /^[0-9a-f]{64}$/.test(b.sha256)
  if (!ok) return undefined
  return {
    code: b.code as number,
    minVersionCode: b.minVersionCode as number,
    bytes: Number(b.bytes) || 0,
    sha256: b.sha256 as string,
    released: typeof b.released === 'string' ? b.released : '',
    url: b.url as string,
    notes: stringList(b.notes),
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
  // Coming back to the app mid-download must not replace the progress bar.
  if (status.kind === 'installing') return Promise.resolve()
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
        // No new APK. A pushed update is the other thing there can be —
        // only one built against this APK or an older one, since a bundle
        // may call a plugin that an older APK does not carry.
        const bundle = manifest.bundle
        if (pushCapable && bundle && bundle.code > RUNNING_BUNDLE && build >= bundle.minVersionCode) {
          setStatus({
            kind: 'pushed',
            checkedAt,
            push: {
              code: bundle.code,
              bytes: bundle.bytes,
              sha256: bundle.sha256,
              released: bundle.released,
              notes: bundle.notes,
              url: new URL(bundle.url, MANIFEST_URL).href,
            },
          })
          return
        }
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

/* ------------------------------------------------------------------ *
 * Pushed updates.
 * ------------------------------------------------------------------ */

/**
 * Tell the updater this bundle started properly.
 *
 * Called once the first screen has rendered. A pushed bundle that never
 * gets this far — a crash on load — is not marked healthy, and the
 * updater puts the previous bundle back on its own after
 * `appReadyTimeout`. That is the safety net under every push, so it is
 * called from the app's own first effect and not earlier.
 */
export function markBundleHealthy(): void {
  // Whenever the plugin is present, not only when updates are configured:
  // its rollback timer runs either way.
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('CapacitorUpdater')) return
  void CapacitorUpdater.notifyAppReady().catch(() => {})
}

/**
 * Download a pushed update, verify it, and switch to it.
 *
 * The updater fetches the zip natively and refuses it unless its SHA-256
 * matches the manifest's, before unpacking anything. `set` reloads the
 * WebView into the new bundle, so on success nothing after it runs; the
 * profile is untouched because it lives in Preferences and on disk, not
 * in the bundle.
 */
export async function installPushedUpdate(push: PushedUpdate): Promise<void> {
  if (!pushCapable || status.kind === 'installing') return
  setStatus({ kind: 'installing', push, percent: 0 })

  const progress = await CapacitorUpdater.addListener('download', ({ percent }) => {
    if (status.kind === 'installing') setStatus({ kind: 'installing', push, percent })
  })
  try {
    // A download that finished earlier (the user tapped, then lost the
    // reload) is reused rather than fetched again.
    const version = String(push.code)
    const { bundles } = await CapacitorUpdater.list()
    const ready = bundles.find((b) => b.version === version && b.checksum === push.sha256)
    const bundle =
      ready ?? (await CapacitorUpdater.download({ url: push.url, version, checksum: push.sha256 }))
    await CapacitorUpdater.set({ id: bundle.id })
  } catch {
    setStatus({ kind: 'install-failed', push, checkedAt: Date.now() })
  } finally {
    void progress.remove()
  }
}

/** "7.1 MB", as the landing site writes it. */
export function formatBytes(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`
}
