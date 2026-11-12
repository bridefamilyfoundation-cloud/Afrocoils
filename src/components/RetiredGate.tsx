import { useEffect, useState, type ReactNode } from 'react'
import Icon from './Icon'
import { useHairProfile } from '../lib/profile-store'
import {
  checkForUpdates,
  formatBytes,
  installPushedUpdate,
  installedVersion,
  isRetired,
  updatesConfigured,
  useReportedFloor,
  useUpdateStatus,
} from '../lib/updates'
import { Capacitor } from '@capacitor/core'

/**
 * The kill switch, on the phone.
 *
 * `latest.json` can name a floor (`ReleaseFloor` in types.ts): the oldest
 * pushed update and the oldest APK still allowed to run. A copy under it
 * gets this one screen in place of the whole app, and the only thing on
 * it is the update. There is no "Not now", because the point of retiring
 * a version is that it stops.
 *
 * The floor arrives with the update check and with every membership
 * answer, and the last one heard is kept on the profile, so a retired
 * copy is still retired with no signal and with the update check
 * switched off. Lowering or removing the floor releases the phone on its
 * next answer.
 *
 * Nothing installs by itself here either: the screen offers, the person
 * taps. Their profile, history and photos are untouched — only the
 * screens are held back.
 */

/** Whether this copy is under the floor it was last told. */
export function useRetired(): boolean {
  const { profile, ready } = useHairProfile()
  const reported = useReportedFloor()
  const [build, setBuild] = useState<number>()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void installedVersion()
      .then((installed) => setBuild(installed.build))
      .catch(() => undefined)
  }, [])

  // What was heard this session wins over what the profile remembers.
  return isRetired(reported ?? (ready ? profile.updates.floor : undefined), build)
}

export default function RetiredGate({ children }: { children: ReactNode }) {
  const { profile, ready, update } = useHairProfile()
  const reported = useReportedFloor()
  const retired = useRetired()

  // Keep the newest floor on the profile, and drop it when it is lifted.
  useEffect(() => {
    if (!ready || !reported) return
    const next = reported.bundle || reported.versionCode ? reported : undefined
    const kept = profile.updates.floor
    if (kept?.bundle === next?.bundle && kept?.versionCode === next?.versionCode) return
    update({ updates: { ...profile.updates, floor: next } })
  }, [ready, reported, profile.updates, update])

  return retired ? <RetiredScreen /> : <>{children}</>
}

function RetiredScreen() {
  const status = useUpdateStatus()

  // Asked for by the screen itself, whatever the About switch says: it
  // is the only way off this screen, and it is the same request.
  useEffect(() => {
    void checkForUpdates({ force: true })
  }, [])

  const push =
    status.kind === 'pushed' || status.kind === 'installing' || status.kind === 'install-failed'
      ? status.push
      : undefined
  const installing = status.kind === 'installing'
  const button =
    'flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg font-bold text-on-secondary shadow-card transition-all active:scale-95 disabled:opacity-60'

  return (
    <div className="relative isolate flex min-h-full items-center justify-center px-container-padding py-2xl text-on-background">
      <div aria-hidden className="page-wash fixed inset-0 -z-10" />
      <main className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-lg text-center shadow-card">
        <span className="mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-on-secondary">
          <Icon name="system_update" className="text-3xl" />
        </span>
        <h1 className="mb-sm font-headline-lg text-headline-lg text-on-background">Time to update AfroCoils</h1>
        <p className="mb-lg font-body-md text-body-md text-on-surface-variant">
          This version has been retired, so it no longer opens. Update to carry on. Your profile,
          history and photos stay exactly where they are.
        </p>

        <div aria-live="polite">
          {push ? (
            <>
              <p className="mb-md font-body-md text-caption text-on-surface-variant">
                {status.kind === 'install-failed'
                  ? 'The update could not be downloaded or did not check out, so nothing was changed. Try again when you have a steadier connection.'
                  : installing
                    ? `Downloading and checking… ${Math.round(status.percent)}%. The app restarts into the update when it is done.`
                    : `Update ${push.code} · ${formatBytes(push.bytes)}. It installs in place, with nothing to reinstall.`}
              </p>
              <button type="button" disabled={installing} onClick={() => void installPushedUpdate(push)} className={button}>
                <Icon name="system_update" className="text-[20px]" />
                {installing ? 'Updating…' : status.kind === 'install-failed' ? 'Try again' : 'Update now'}
              </button>
            </>
          ) : status.kind === 'available' ? (
            <>
              <p className="mb-md font-body-md text-caption text-on-surface-variant">
                AfroCoils {status.update.version} · {formatBytes(status.update.bytes)}. It installs over
                this one; your phone will ask you to confirm.
              </p>
              <a href={status.update.downloadUrl} target="_blank" rel="noopener noreferrer" className={button}>
                <Icon name="download" className="text-[20px]" />
                Download update
              </a>
            </>
          ) : (
            <>
              <p className="mb-md font-body-md text-caption text-on-surface-variant">
                {status.kind === 'checking' || status.kind === 'idle'
                  ? 'Looking for the update…'
                  : status.kind === 'unsupported'
                    ? `The current version needs Android ${status.minAndroid} or newer, which this phone does not have.`
                    : status.kind === 'failed' || !updatesConfigured
                      ? 'The update server could not be reached. Connect to the internet and try again, or get the current version from afrocoils.app.'
                      : 'Get the current version from afrocoils.app.'}
              </p>
              {updatesConfigured && status.kind !== 'unsupported' && (
                <button
                  type="button"
                  disabled={status.kind === 'checking'}
                  onClick={() => void checkForUpdates({ force: true })}
                  className={button}
                >
                  <Icon name="history" className="text-[20px]" />
                  {status.kind === 'checking' ? 'Checking…' : 'Try again'}
                </button>
              )}
            </>
          )}
        </div>

        <p className="mt-lg font-body-md text-caption text-on-surface-variant">
          Stuck? Write to{' '}
          <a href="mailto:support@afrocoils.app" className="text-primary underline">
            support@afrocoils.app
          </a>
          .
        </p>
      </main>
    </div>
  )
}
