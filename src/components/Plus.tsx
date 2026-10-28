import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Icon from './Icon'
import {
  BILLING_MODE,
  PurchaseCancelled,
  plusPrice,
  purchasePlus,
  restorePlus,
} from '../lib/billing'
import { useBackDismiss } from '../lib/back-button'
import { PlusContext, usePlus, type PlusTrigger } from '../lib/plus'
import { useHairProfile } from '../lib/profile-store'

/**
 * AfroCoils Plus: the provider, the unlock sheet, and the two small
 * pieces screens draw where something is locked. The split itself —
 * what is free and what is Plus — is in lib/plus.ts.
 *
 * The sheet is one screen and stays one: what Plus includes, one price,
 * Unlock, Restore, and a way out. No timer, no "limited offer", no
 * second sheet after the first is closed.
 */

const LEAD: Record<PlusTrigger, string> = {
  locs: 'This chapter is part of Plus.',
  lookbook: 'This look is part of Plus.',
  growth: 'Your growth insights are part of Plus.',
  reminders: 'Care reminders are part of Plus.',
  recommended: 'The full list for your hair is part of Plus.',
  ask: 'The full answer is part of Plus.',
  manage: 'Everything AfroCoils has, unlocked once.',
}

const FEATURES: { icon: 'grass' | 'checkroom' | 'insights' | 'notifications' | 'auto_awesome'; text: string }[] = [
  { icon: 'grass', text: 'Every Locs World chapter — washing, retwisting, repair, colouring and more' },
  { icon: 'checkroom', text: 'The full Loc Lookbook, every look front, back and side' },
  { icon: 'insights', text: 'Growth insights: how much length you keep, and when you’ll reach each milestone' },
  { icon: 'notifications', text: 'Care reminders on your phone' },
  { icon: 'auto_awesome', text: 'Styles recommended for your hair' },
]

type Busy = 'buying' | 'restoring' | null

/** Set once the app has suggested Plus this launch. Module state: a launch, not a screen. */
let offeredThisLaunch = false

export function PlusProvider({ children }: { children: ReactNode }) {
  const { profile } = useHairProfile()
  const unlocked = profile.plus !== undefined
  const [trigger, setTrigger] = useState<PlusTrigger | null>(null)

  const open = useCallback((t: PlusTrigger) => setTrigger(t), [])
  const offer = useCallback(
    (t: PlusTrigger) => {
      if (unlocked || offeredThisLaunch) return
      offeredThisLaunch = true
      setTrigger(t)
    },
    [unlocked],
  )
  const dismiss = useCallback(() => setTrigger(null), [])
  const value = useMemo(() => ({ unlocked, open, offer }), [unlocked, open, offer])

  return (
    <PlusContext.Provider value={value}>
      {children}
      <PlusSheet trigger={trigger} onClose={dismiss} />
    </PlusContext.Provider>
  )
}

function PlusSheet({ trigger, onClose }: { trigger: PlusTrigger | null; onClose: () => void }) {
  const { profile, update } = useHairProfile()
  const open = trigger !== null
  const [busy, setBusy] = useState<Busy>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [price, setPrice] = useState<string | null>(null)
  const [justUnlocked, setJustUnlocked] = useState(false)
  const first = useRef<HTMLButtonElement>(null)
  // A ref, so `close` stays the same function while a purchase runs:
  // the open effect below depends on it, and re-running that effect
  // would clear the message a failed payment just set.
  const busyRef = useRef<Busy>(null)
  busyRef.current = busy
  const close = useCallback(() => {
    if (busyRef.current) return
    onClose()
  }, [onClose])
  useBackDismiss(open, close)

  useEffect(() => {
    if (!open) return
    setMessage(null)
    setJustUnlocked(false)
    void plusPrice().then(setPrice)
    const returnTo = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    first.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      returnTo?.focus({ preventScroll: true })
    }
  }, [open, close])

  async function unlock() {
    setBusy('buying')
    setMessage(null)
    try {
      update({ plus: await purchasePlus() })
      setJustUnlocked(true)
    } catch (error) {
      setMessage(
        error instanceof PurchaseCancelled
          ? null
          : 'The payment didn’t go through, and you haven’t been charged. Try again in a moment.',
      )
    } finally {
      setBusy(null)
    }
  }

  async function restore() {
    setBusy('restoring')
    setMessage(null)
    try {
      const found = await restorePlus()
      if (found) {
        update({ plus: found })
        setJustUnlocked(true)
      } else {
        setMessage(
          BILLING_MODE === 'test'
            ? 'Test mode: there’s no store to restore from yet.'
            : 'No earlier purchase was found for this account.',
        )
      }
    } catch {
      setMessage('Couldn’t reach the store. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  const unlocked = profile.plus !== undefined

  return (
    <>
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-[75] bg-inverse-surface/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <section
        inert={!open}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plus-sheet-title"
        className={`fixed inset-x-0 bottom-0 z-[76] mx-auto max-h-[92vh] max-w-2xl overflow-y-auto rounded-t-3xl bg-surface px-lg pb-[calc(1.5rem+var(--safe-bottom))] pt-md shadow-xl transition-transform duration-200 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mb-md flex items-center justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-on-secondary">
            <Icon name="workspace_premium" className="text-[26px]" />
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container active:scale-90"
          >
            <Icon name="close" className="text-on-surface" />
          </button>
        </div>

        <h2
          id="plus-sheet-title"
          className="mb-xs font-headline-md text-headline-md font-bold text-on-surface"
        >
          {justUnlocked || unlocked ? 'Plus is unlocked' : 'AfroCoils Plus'}
        </h2>

        {justUnlocked || unlocked ? (
          <>
            <p className="mb-xl font-body-md text-body-md text-on-surface-variant">
              Everything below is open now, and it works with no signal. Thank you for
              supporting AfroCoils.
            </p>
            <button
              ref={first}
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-secondary py-4 font-label-md text-label-md font-bold text-on-secondary active:scale-[0.98]"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <p className="mb-lg font-body-md text-body-md text-on-surface-variant">
              {trigger ? LEAD[trigger] : LEAD.manage}
            </p>

            {BILLING_MODE === 'test' && (
              <p className="mb-lg rounded-xl bg-secondary-fixed p-md font-body-md text-caption text-on-surface">
                <strong>Test mode.</strong> Payment isn’t set up yet, so unlocking here is free
                and takes no money. It is for trying the flow.
              </p>
            )}

            <ul className="mb-lg space-y-sm">
              {FEATURES.map((f) => (
                <li key={f.text} className="flex items-start gap-md">
                  <Icon name={f.icon} className="shrink-0 text-[20px] leading-6 text-primary" />
                  <span className="font-body-md text-body-md text-on-surface">{f.text}</span>
                </li>
              ))}
            </ul>

            <p className="mb-md flex items-center gap-sm font-body-md text-caption text-on-surface-variant">
              <Icon name="cloud_off" className="shrink-0 text-[16px] text-primary" />
              Works with no signal once unlocked.
            </p>

            <button
              ref={first}
              type="button"
              onClick={() => void unlock()}
              disabled={busy !== null}
              className="mb-xs w-full rounded-full bg-secondary py-4 font-label-md text-label-md font-bold text-on-secondary transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {busy === 'buying' ? 'Unlocking…' : price ? `Unlock for ${price}` : 'Unlock Plus'}
            </button>
            <p className="mb-md text-center font-caption text-caption text-on-surface-variant">
              One payment, yours for good. No subscription.
            </p>

            {message && (
              <p
                role="status"
                className="mb-md rounded-xl bg-surface-container p-md text-center font-body-md text-caption text-on-surface"
              >
                {message}
              </p>
            )}

            <div className="flex items-center justify-between gap-md">
              <button
                type="button"
                onClick={() => void restore()}
                disabled={busy !== null}
                className="rounded-full px-md py-2 font-label-md text-label-md text-primary active:scale-95 disabled:opacity-60"
              >
                {busy === 'restoring' ? 'Looking…' : 'Restore purchase'}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={busy !== null}
                className="rounded-full px-md py-2 font-label-md text-label-md text-on-surface-variant active:scale-95"
              >
                Not now
              </button>
            </div>

            <p className="mt-lg border-t border-outline-variant/40 pt-md font-caption text-caption text-on-surface-variant">
              Free stays free: Hair SOS, Hair Care, the Quick Hair Check, Ask, your profile and
              every “when to see a professional” chapter are never locked.
            </p>
          </>
        )}
      </section>
    </>
  )
}

/** The small "Plus" pill beside something locked. */
export function PlusBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-xs rounded-full bg-secondary px-sm py-[2px] font-label-md text-caption font-bold text-on-secondary ${className}`}
    >
      <Icon name="lock" className="text-[12px]" />
      Plus
    </span>
  )
}

/**
 * Where locked content would continue: what it is, and the way in. Drawn
 * under a preview, never instead of one.
 */
export function PlusCard({
  trigger,
  title,
  body,
  dark = false,
}: {
  trigger: PlusTrigger
  title: string
  body?: string
  /** On espresso (the lookbook plates) rather than cream. */
  dark?: boolean
}) {
  const plus = usePlus()
  // The button sits under the text, on the left: the floating Ask button
  // lives at the bottom right of every screen and would cover it there.
  return (
    <div className={`rounded-2xl p-md ${dark ? 'bg-inverse-on-surface/10' : 'bg-surface-container'}`}>
      <div className="mb-sm flex items-start gap-md">
        <Icon
          name="lock"
          className={`shrink-0 leading-6 ${dark ? 'text-inverse-primary' : 'text-primary'}`}
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block font-label-md text-body-md ${
              dark ? 'text-inverse-on-surface' : 'text-on-surface'
            }`}
          >
            {title}
          </span>
          {body && (
            <span
              className={`block font-caption text-caption ${
                dark ? 'text-inverse-on-surface/75' : 'text-on-surface-variant'
              }`}
            >
              {body}
            </span>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={() => plus.open(trigger)}
        className="ml-[2.5rem] rounded-full bg-secondary px-lg py-2 font-label-md text-caption font-bold text-on-secondary active:scale-95"
      >
        Unlock Plus
      </button>
    </div>
  )
}

/**
 * Plus on Profile and About: whether it is unlocked, the way to see what
 * it includes, and Restore purchase where someone on a new phone will
 * look for it.
 */
export function PlusStatus() {
  const { profile, update } = useHairProfile()
  const plus = usePlus()
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function restore() {
    setRestoring(true)
    setMessage(null)
    try {
      const found = await restorePlus()
      if (found) update({ plus: found })
      else
        setMessage(
          BILLING_MODE === 'test'
            ? 'Test mode: there’s no store to restore from yet.'
            : 'No earlier purchase was found for this account.',
        )
    } catch {
      setMessage('Couldn’t reach the store. Check your connection and try again.')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <section className="mb-2xl rounded-2xl shadow-card bg-surface-container-lowest p-lg">
      <div className="mb-sm flex items-center gap-sm">
        <Icon name="workspace_premium" className="text-primary" />
        <h2 className="font-headline-md text-body-lg text-on-surface">AfroCoils Plus</h2>
      </div>
      {profile.plus ? (
        <>
          <p className="mb-md font-body-md text-body-md text-on-surface-variant">
            Unlocked on{' '}
            {new Date(profile.plus.unlockedISO).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            . Everything is open, and works with no signal.
          </p>
          {profile.plus.via === 'test' && (
            <button
              type="button"
              onClick={() => update({ plus: undefined })}
              className="rounded-full border border-outline-variant px-lg py-2 font-label-md text-label-md text-on-surface active:scale-95"
            >
              Remove test unlock
            </button>
          )}
        </>
      ) : (
        <>
          <p className="mb-md font-body-md text-body-md text-on-surface-variant">
            One payment unlocks every Locs World chapter, the full Loc Lookbook, growth
            insights, care reminders and styles recommended for your hair.
          </p>
          <div className="flex flex-wrap items-center gap-sm">
            <button
              type="button"
              onClick={() => plus.open('manage')}
              className="rounded-full bg-secondary px-lg py-2 font-label-md text-label-md font-bold text-on-secondary active:scale-95"
            >
              See what Plus includes
            </button>
            <button
              type="button"
              onClick={() => void restore()}
              disabled={restoring}
              className="rounded-full px-md py-2 font-label-md text-label-md text-primary active:scale-95 disabled:opacity-60"
            >
              {restoring ? 'Looking…' : 'Restore purchase'}
            </button>
          </div>
          {message && (
            <p role="status" className="mt-sm font-body-md text-caption text-on-surface-variant">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  )
}
