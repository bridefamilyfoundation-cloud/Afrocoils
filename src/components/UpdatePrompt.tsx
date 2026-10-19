import { useEffect, useRef, useState } from 'react'
import { App } from '@capacitor/app'
import Icon from './Icon'
import { useBackDismiss } from '../lib/back-button'
import { useHairProfile } from '../lib/profile-store'
import { checkForUpdates, formatBytes, updatesConfigured, useUpdateStatus } from '../lib/updates'

/**
 * "A new version of Afrocoil is available."
 *
 * Checks when the app opens and whenever it comes back to the
 * foreground (no more than every six hours — see `checkForUpdates`), and
 * slides up a sheet when the landing site has posted a newer build.
 *
 * Two ways out, and they mean different things:
 *
 * - **Download** opens the APK in the system browser. Android takes it
 *   from there — the user still confirms the install — and because the
 *   new build carries the same signature and a higher versionCode, it
 *   installs *over* this one and the profile survives.
 * - **Not now** records that version as declined, so the sheet does not
 *   come back for it on every launch. A later version asks again, and
 *   About keeps showing the update either way.
 *
 * Back and a tap on the scrim only close it for this session, because
 * neither is a decision.
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

  const available = status.kind === 'available' ? status.update : undefined
  const open =
    enabled &&
    !closed &&
    available !== undefined &&
    available.versionCode !== profile.updates.dismissedVersionCode

  useBackDismiss(open, () => setClosed(true))

  if (!available) return null

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
        onClick={() => setClosed(true)}
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
              A new version is out
            </h2>
            <p className="font-body-md text-caption text-on-surface-variant">
              Afrocoil {available.version} · {formatBytes(available.bytes)}
            </p>
          </div>
        </div>

        {available.notes.length > 0 && (
          <ul className="mb-md space-y-xs rounded-2xl bg-surface-container p-md">
            {available.notes.map((note) => (
              <li key={note} className="flex gap-sm font-body-md text-body-md text-on-surface">
                <Icon name="check" className="mt-0.5 shrink-0 text-[18px] text-secondary" />
                {note}
              </li>
            ))}
          </ul>
        )}

        <p className="mb-lg font-body-md text-body-md text-on-surface-variant">
          It installs over this one, so your profile, history and photos stay where they are.
          Your phone will ask you to confirm.
        </p>

        {/* A plain anchor: Capacitor sends an external navigation to the
            system browser, which downloads the APK. Same reasoning as the
            source links on GuideScreen. */}
        <a
          href={available.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setClosed(true)}
          className="mb-sm flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg text-on-secondary shadow-lg transition-all active:scale-95"
        >
          <Icon name="download" className="text-[20px]" />
          Download update
        </a>
        <button
          type="button"
          onClick={() => update({ updates: { ...profile.updates, dismissedVersionCode: available.versionCode } })}
          className="w-full rounded-full py-3 font-label-md text-label-md text-on-surface-variant transition-all active:scale-95"
        >
          Not now
        </button>
      </section>
    </div>
  )
}
