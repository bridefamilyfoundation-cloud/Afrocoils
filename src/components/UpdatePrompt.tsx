import { useEffect, useRef, useState } from 'react'
import { App } from '@capacitor/app'
import Icon from './Icon'
import { useBackDismiss } from '../lib/back-button'
import { useHairProfile } from '../lib/profile-store'
import {
  checkForUpdates,
  formatBytes,
  installPushedUpdate,
  markBundleHealthy,
  updatesConfigured,
  useUpdateStatus,
} from '../lib/updates'

/**
 * "An update is ready" — the app's built-in notice for both kinds.
 *
 * Checks when the app opens and whenever it comes back to the
 * foreground (no more than every six hours — see `checkForUpdates`), and
 * slides up a sheet when something newer has been posted:
 *
 * - **A pushed update** — new screens and content for this same APK.
 *   *Update now* downloads it, has it verified, and restarts the app
 *   into it a few seconds later. Nothing is reinstalled and Android does
 *   not need to ask.
 * - **A new APK** — needed when the native side changed. *Download*
 *   opens it in the system browser; the new build carries the same
 *   signature and a higher versionCode, so it installs *over* this one
 *   and the profile survives. Android asks the user to confirm.
 *
 * **Not now** records that update as declined, so the sheet does not
 * come back for it on every launch. A later one asks again, and About
 * keeps offering it either way. Back and a tap on the scrim only close
 * it for this session, because neither is a decision.
 *
 * Mounted once, beside the router, so it can appear over any screen. It
 * waits for the profile to load: until then `updates.check` reads as its
 * default, and asking someone who switched checks off would be the app
 * ignoring them for the length of a disk read.
 */
export default function UpdatePrompt() {
  const { profile, ready, update } = useHairProfile()
  const status = useUpdateStatus()
  const [closed, setClosed] = useState(false)
  const enabled = ready && profile.updates.check

  // The resume listener outlives renders, so it reads the setting
  // through a ref rather than capturing the first one it saw.
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  // This component commits with the first screen, so reaching this
  // effect means the bundle loaded. See markBundleHealthy.
  useEffect(() => {
    markBundleHealthy()
  }, [])

  useEffect(() => {
    if (enabled) void checkForUpdates()
  }, [enabled])

  useEffect(() => {
    if (!updatesConfigured) return
    const listener = App.addListener('resume', () => {
      if (enabledRef.current) void checkForUpdates()
    })
    return () => {
      void listener.then((handle) => handle.remove())
    }
  }, [])

  const apk = status.kind === 'available' ? status.update : undefined
  const push =
    status.kind === 'pushed' || status.kind === 'installing' || status.kind === 'install-failed'
      ? status.push
      : undefined
  const installing = status.kind === 'installing'

  const declined =
    (apk !== undefined && apk.versionCode === profile.updates.dismissedVersionCode) ||
    (push !== undefined && push.code === profile.updates.dismissedBundleCode)
  const open = enabled && !closed && (apk !== undefined || push !== undefined) && (!declined || installing)

  // Back cannot interrupt a download that is already verifying.
  useBackDismiss(open && !installing, () => setClosed(true))

  if (!apk && !push) return null

  const notes = apk?.notes ?? push?.notes ?? []

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-end justify-center transition-opacity duration-200 ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      inert={!open}
    >
      <div
        className="absolute inset-0 bg-inverse-surface/40"
        aria-hidden="true"
        onClick={() => !installing && setClosed(true)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        className={`relative w-full max-w-lg rounded-t-[28px] bg-surface-container-lowest px-lg pb-[calc(1.5rem+var(--safe-bottom))] pt-lg shadow-xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-lg h-1 w-10 rounded-full bg-outline-variant" aria-hidden="true" />

        <div className="mb-md flex items-center gap-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <Icon name="system_update" className="text-[26px]" />
          </span>
          <div className="min-w-0">
            <h2 id="update-title" className="font-headline-md text-headline-md text-on-surface">
              {apk ? 'A new version is out' : 'An update is ready'}
            </h2>
            <p className="font-body-md text-caption text-on-surface-variant">
              {apk
                ? `AfroCoils ${apk.version} · ${formatBytes(apk.bytes)}`
                : `Update ${push!.code} · ${formatBytes(push!.bytes)}`}
            </p>
          </div>
        </div>

        {notes.length > 0 && (
          <ul className="mb-md space-y-xs rounded-2xl bg-surface-container p-md">
            {notes.map((note) => (
              <li key={note} className="flex gap-sm font-body-md text-body-md text-on-surface">
                <Icon name="check" className="mt-0.5 shrink-0 text-[18px] text-secondary" />
                {note}
              </li>
            ))}
          </ul>
        )}

        {apk ? (
          <>
            <p className="mb-lg font-body-md text-body-md text-on-surface-variant">
              It installs over this one, so your profile, history and photos stay where they are.
              Your phone will ask you to confirm.
            </p>
            {/* A plain anchor: Capacitor sends an external navigation to the
                system browser, which downloads the APK. */}
            <a
              href={apk.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setClosed(true)}
              className="mb-sm flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg font-bold text-on-secondary shadow-lg transition-all active:scale-95"
            >
              <Icon name="download" className="text-[20px]" />
              Download update
            </a>
          </>
        ) : (
          <>
            <p className="mb-lg font-body-md text-body-md text-on-surface-variant" aria-live="polite">
              {status.kind === 'install-failed'
                ? 'The update could not be downloaded or did not check out, so nothing was changed. Try again when you have a steadier connection.'
                : installing
                  ? `Downloading and checking… ${Math.round(status.percent)}%. The app restarts into the update when it is done.`
                  : 'It updates this app in place: nothing to reinstall, and your profile, history and photos stay where they are. The app restarts once to finish.'}
            </p>
            {installing && (
              <div className="mb-md h-2 overflow-hidden rounded-full bg-surface-container" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-secondary transition-[width] duration-300"
                  style={{ width: `${Math.max(4, status.percent)}%` }}
                />
              </div>
            )}
            <button
              type="button"
              disabled={installing}
              onClick={() => void installPushedUpdate(push!)}
              className="mb-sm flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg font-bold text-on-secondary shadow-lg transition-all active:scale-95 disabled:opacity-60"
            >
              <Icon name="system_update" className="text-[20px]" />
              {installing ? 'Updating…' : status.kind === 'install-failed' ? 'Try again' : 'Update now'}
            </button>
          </>
        )}

        {!installing && (
          <button
            type="button"
            onClick={() =>
              update({
                updates: apk
                  ? { ...profile.updates, dismissedVersionCode: apk.versionCode }
                  : { ...profile.updates, dismissedBundleCode: push!.code },
              })
            }
            className="w-full rounded-full py-3 font-label-md text-label-md text-on-surface-variant transition-all active:scale-95"
          >
            Not now
          </button>
        )}
      </section>
    </div>
  )
}
