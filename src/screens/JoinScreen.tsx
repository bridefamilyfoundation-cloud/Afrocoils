import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { MEMBER_SECTIONS } from '../content/membership'
import {
  MembershipError,
  checkStatus,
  checkoutUrl,
  formatPrice,
  hasAccess,
  openExternal,
  requestCode,
  toMembership,
  verifyCode,
} from '../lib/membership'
import { useHairProfile } from '../lib/profile-store'
import type { PlanPrice } from '../lib/types'

/**
 * `/join` — registration, payment and signing in, which are one flow.
 *
 * Every feature is for paying members, and a member is an email
 * address, so the steps are the same whether someone is new or coming
 * back on a new phone:
 *
 * 1. **Email.** A six-digit code goes to it from no-reply@afrocoils.app.
 * 2. **Code.** Confirms the address is theirs. A paid-up address opens
 *    the app here.
 * 3. **Pay.** An address that is not paid up is offered the monthly
 *    plan, at the price Paystack holds for it, on Paystack's own page in
 *    the browser. Coming back to the app checks again (MembershipSync),
 *    and so does "I've paid".
 *
 * The Terms and the Privacy Policy are linked beside the button that
 * pays, and both open while locked.
 */


type Step = 'email' | 'code' | 'pay'

export default function JoinScreen() {
  const { profile, update } = useHairProfile()
  const membership = profile.membership
  const [step, setStep] = useState<Step>(membership ? 'pay' : 'email')
  const [email, setEmail] = useState(membership?.email ?? '')
  const [code, setCode] = useState('')
  const [price, setPrice] = useState<PlanPrice | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const codeInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'code') codeInput.current?.focus()
  }, [step])

  // Signed in but not paid: fetch the price for the pay step.
  useEffect(() => {
    if (step !== 'pay' || !membership || price !== undefined) return
    void checkStatus(membership.token)
      .then((response) => {
        update({ membership: toMembership(response) })
        setPrice(response.price ?? null)
      })
      .catch(() => setPrice(null))
  }, [step, membership, price, update])

  if (hasAccess(membership)) return <Navigate to="/sos" replace />

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await task()
    } catch (e) {
      setError(e instanceof MembershipError ? e.message : 'Something went wrong. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const sendCode = (event?: FormEvent) => {
    event?.preventDefault()
    void run(async () => {
      await requestCode(email.trim())
      setCode('')
      setStep('code')
      setNote(`We sent a six-digit code to ${email.trim()}. It can take a minute; check spam too.`)
    })
  }

  const confirm = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      const response = await verifyCode(email.trim(), code)
      update({ membership: toMembership(response) })
      setPrice(response.price ?? null)
      setStep('pay')
    })
  }

  const pay = () =>
    void run(async () => {
      if (!membership) return
      openExternal(await checkoutUrl(membership.token))
      setNote('Finish paying on the Paystack page, then come back here. The app opens by itself once the payment is through.')
    })

  const recheck = () =>
    void run(async () => {
      if (!membership) return
      const response = await checkStatus(membership.token)
      update({ membership: toMembership(response) })
      setPrice(response.price ?? null)
      if (!hasAccess(toMembership(response))) {
        setNote('No payment on this email yet. Paystack can take a minute to tell us — try again shortly.')
      }
    })

  const signOut = () => {
    update({ membership: undefined })
    setStep('email')
    setCode('')
    setPrice(undefined)
    setError(null)
    setNote(null)
  }

  const priceLine = formatPrice(price)
  const lapsed = membership && membership.paidUntilISO !== null

  return (
    <div className="mx-auto max-w-lg pb-xl">
      <header className="mb-xl text-center">
        <span className="mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-on-secondary shadow-card">
          <Icon name="workspace_premium" className="text-3xl" />
        </span>
        <h1 className="mb-sm font-headline-lg text-headline-lg text-on-background">
          {step === 'pay' ? (lapsed ? 'Renew your membership' : 'One step left') : 'Become a member'}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {step === 'pay'
            ? `Signed in as ${membership?.email}.`
            : 'Everything in AfroCoils is for members. Your email is your membership: enter it to join, or to sign in on a new phone.'}
        </p>
      </header>

      <section className="mb-xl rounded-2xl bg-surface-container-lowest p-lg shadow-card">
        {step === 'email' && (
          <form onSubmit={sendCode}>
            <label htmlFor="join-email" className="mb-sm block font-label-md text-label-md text-on-surface">
              Your email
            </label>
            <input
              id="join-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mb-md w-full rounded-xl border-outline-variant bg-surface px-md py-3 font-body-md text-body-md text-on-surface focus:border-secondary focus:ring-secondary"
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg font-bold text-on-secondary shadow-card transition-all active:scale-95 disabled:opacity-60"
            >
              <Icon name="mail" className="text-[20px]" />
              {busy ? 'Sending…' : 'Send my code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={confirm}>
            <label htmlFor="join-code" className="mb-sm block font-label-md text-label-md text-on-surface">
              Six-digit code
            </label>
            <input
              id="join-code"
              ref={codeInput}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mb-md w-full rounded-xl border-outline-variant bg-surface px-md py-3 text-center font-headline-md text-headline-md tracking-[0.5em] text-on-surface focus:border-secondary focus:ring-secondary"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="mb-md flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg font-bold text-on-secondary shadow-card transition-all active:scale-95 disabled:opacity-60"
            >
              <Icon name="check" className="text-[20px]" />
              {busy ? 'Checking…' : 'Confirm'}
            </button>
            <div className="flex justify-between gap-md font-body-md text-caption">
              <button type="button" onClick={() => setStep('email')} className="text-on-surface-variant underline">
                Use a different email
              </button>
              <button type="button" onClick={() => sendCode()} disabled={busy} className="text-primary underline">
                Send a new code
              </button>
            </div>
          </form>
        )}

        {step === 'pay' && (
          <div>
            <p className="mb-xs font-label-md text-label-md text-on-surface-variant">Monthly membership</p>
            <p className="mb-md font-headline-md text-headline-md text-on-surface">
              {priceLine ?? (price === undefined ? 'Checking the price…' : 'Price shown on the next page')}
            </p>
            <p className="mb-lg font-body-md text-caption text-on-surface-variant">
              Paid by card on Paystack&rsquo;s secure page, renewed each month until you cancel. Cancel any
              time from My Hair Profile; you keep access to the end of the month you paid for.
            </p>
            <button
              type="button"
              onClick={pay}
              disabled={busy}
              className="mb-sm flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg font-bold text-on-secondary shadow-card transition-all active:scale-95 disabled:opacity-60"
            >
              <Icon name="open_in_new" className="text-[20px]" />
              {busy ? 'Opening Paystack…' : lapsed ? 'Renew with Paystack' : 'Subscribe with Paystack'}
            </button>
            <button
              type="button"
              onClick={recheck}
              disabled={busy}
              className="mb-md flex w-full items-center justify-center gap-sm rounded-full bg-surface-container-high py-3 font-label-md text-label-md font-bold text-on-surface transition-all active:scale-95 disabled:opacity-60"
            >
              I&rsquo;ve paid — check again
            </button>
            <p className="mb-md text-center font-body-md text-caption text-on-surface-variant">
              By subscribing you agree to the{' '}
              <Link to="/legal/terms" className="text-primary underline">
                Terms of Service
              </Link>{' '}
              and the{' '}
              <Link to="/legal/privacy" className="text-primary underline">
                Privacy Policy
              </Link>
              .
            </p>
            <button type="button" onClick={signOut} className="mx-auto flex items-center gap-xs font-body-md text-caption text-on-surface-variant underline">
              <Icon name="logout" className="text-[16px]" />
              Sign out, or use a different email
            </button>
          </div>
        )}

        {note && (
          <p role="status" className="mt-md rounded-xl bg-secondary-fixed/40 p-md font-body-md text-caption text-on-surface">
            {note}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-md rounded-xl bg-error-container p-md font-body-md text-caption text-on-error-container">
            {error}
          </p>
        )}
      </section>

      <section aria-labelledby="included" className="mb-xl">
        <h2 id="included" className="mb-md font-headline-md text-body-lg font-bold text-on-surface">
          What membership opens
        </h2>
        <ul className="space-y-sm">
          {MEMBER_SECTIONS.map((item) => (
            <li key={item.title} className="flex items-start gap-md rounded-2xl bg-surface-container-lowest p-md shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                <Icon name={item.icon} className="text-[22px]" />
              </span>
              <span>
                <span className="block font-label-md text-label-md font-bold text-on-surface">{item.title}</span>
                <span className="block font-body-md text-caption text-on-surface-variant">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center font-body-md text-caption text-on-surface-variant">
        Trouble signing in or paying? Write to{' '}
        <a href="mailto:support@afrocoils.app" className="text-primary underline">
          support@afrocoils.app
        </a>
        .
      </p>
    </div>
  )
}
