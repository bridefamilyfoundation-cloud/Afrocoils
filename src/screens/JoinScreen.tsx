import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { MEMBER_SECTIONS } from '../content/membership'
import {
  MembershipError,
  accessEndsISO,
  autoRenews,
  checkStatus,
  checkoutUrl,
  hasAccess,
  longDate,
  markCheckoutOpened,
  onTrial,
  openExternal,
  planValue,
  requestCode,
  startTrial,
  toMembership,
  verifyCode,
} from '../lib/membership'
import { useHairProfile } from '../lib/profile-store'
import { PLANS, TRIAL_DAYS, formatAmount, type PlanId, type PlanOffer } from '../lib/types'

/**
 * `/join` — registration, the free trial, choosing a plan, paying and
 * signing in, which are one flow.
 *
 * Every feature is for paying members, and a member is an email
 * address, so the steps are the same whether someone is new or coming
 * back on a new phone:
 *
 * 1. **Email.** A six-digit code goes to it from no-reply@afrocoils.app.
 * 2. **Code.** Confirms the address is theirs. An address with access
 *    opens the app here.
 * 3. **Plan.** A new address is offered the three-day free trial (no
 *    card), and every address without a plan that renews by itself is
 *    offered the three plans — Monthly, 6 Months, Annual — at the prices
 *    Paystack holds, with what the longer two save against monthly
 *    worked out from those prices. Paying happens on Paystack's own page
 *    in the browser. Coming back to the app checks again
 *    (MembershipSync), and so does "I've paid".
 *
 * A member on the trial, or on a plan that will not renew, reaches this
 * screen from the reminder banner or My Hair Profile to choose a plan;
 * one whose plan renews by itself is sent on to the app.
 *
 * The Terms and the Privacy Policy are linked beside the button that
 * pays, and both open while locked.
 */

type Step = 'email' | 'code' | 'pay'

export default function JoinScreen() {
  const { profile, update } = useHairProfile()
  const navigate = useNavigate()
  const membership = profile.membership
  const [step, setStep] = useState<Step>(membership ? 'pay' : 'email')
  const [email, setEmail] = useState(membership?.email ?? '')
  const [code, setCode] = useState('')
  // undefined: not asked yet; null: could not be read.
  const [offers, setOffers] = useState<PlanOffer[] | null | undefined>(undefined)
  const [trialAvailable, setTrialAvailable] = useState(false)
  const [chosen, setChosen] = useState<PlanId>('monthly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const codeInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'code') codeInput.current?.focus()
  }, [step])

  function take(response: Awaited<ReturnType<typeof checkStatus>>) {
    update({ membership: toMembership(response) })
    setOffers(response.plans ?? null)
    setTrialAvailable(response.trialAvailable === true)
    // Keep the choice if it is still on offer; otherwise the first plan.
    const ids = (response.plans ?? []).map((p) => p.id)
    setChosen((current) => (ids.includes(current) ? current : (ids[0] ?? 'monthly')))
  }

  // Signed in: fetch the plans and the trial for the plan step.
  useEffect(() => {
    if (step !== 'pay' || !membership || offers !== undefined) return
    void checkStatus(membership.token)
      .then(take)
      .catch(() => setOffers(null))
    // `take` only calls stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, membership, offers])

  if (autoRenews(membership)) return <Navigate to="/sos" replace />

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
      take(response)
      // Signing in on a new phone with access already: straight in.
      if (hasAccess(toMembership(response))) navigate('/sos', { replace: true })
      else setStep('pay')
    })
  }

  const trial = () =>
    void run(async () => {
      if (!membership) return
      const response = await startTrial(membership.token)
      take(response)
      navigate('/sos', { replace: true })
    })

  const pay = () =>
    void run(async () => {
      if (!membership) return
      const url = await checkoutUrl(membership.token, chosen)
      markCheckoutOpened()
      openExternal(url)
      setNote('Finish paying on the Paystack page, then come back here. The app opens by itself once the payment is through.')
    })

  const recheck = () =>
    void run(async () => {
      if (!membership) return
      const response = await checkStatus(membership.token)
      take(response)
      const now = toMembership(response)
      if (autoRenews(now)) return
      if (hasAccess(now) && membership && !hasAccess(membership)) navigate('/sos', { replace: true })
      else setNote('No payment on this email yet. Paystack can take a minute to confirm it — try again shortly.')
    })

  const signOut = () => {
    update({ membership: undefined })
    setStep('email')
    setCode('')
    setOffers(undefined)
    setTrialAvailable(false)
    setError(null)
    setNote(null)
  }

  const open = hasAccess(membership)
  const trialing = onTrial(membership)
  const lapsed = !open && !!membership && (membership.paidUntilISO !== null || membership.trialEndsISO !== null)
  const endsISO = membership && open ? accessEndsISO(membership) : null
  const offer = offers?.find((o) => o.id === chosen)

  const heading =
    step !== 'pay'
      ? 'Become a member'
      : trialing
        ? 'Choose your plan'
        : open
          ? 'Choose your next plan'
          : lapsed
            ? 'Renew your membership'
            : 'One step left'

  return (
    <div className="mx-auto max-w-lg pb-xl">
      <header className="mb-xl text-center">
        <span className="mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-on-secondary shadow-card">
          <Icon name="workspace_premium" className="text-3xl" />
        </span>
        <h1 className="mb-sm font-headline-lg text-headline-lg text-on-background">{heading}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {step === 'pay'
            ? `Signed in as ${membership?.email}.`
            : `Everything in AfroCoils is for members, and new members try it free for ${TRIAL_DAYS} days. Your email is your membership: enter it to join, or to sign in on a new phone.`}
        </p>
      </header>

      {step === 'pay' && trialAvailable && (
        <section aria-labelledby="trial" className="mb-lg rounded-2xl bg-inverse-surface p-lg text-inverse-on-surface shadow-card">
          <h2 id="trial" className="mb-xs flex items-center gap-sm font-headline-md text-body-lg font-bold">
            <Icon name="schedule" className="text-[22px]" />
            Try it free for {TRIAL_DAYS} days
          </h2>
          <p className="mb-md font-body-md text-caption opacity-90">
            Every section, nothing held back, and no card needed. When the trial ends the app
            locks until you choose a plan; nothing is ever charged without you choosing one.
          </p>
          <button
            type="button"
            onClick={trial}
            disabled={busy}
            className="flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg font-bold text-on-secondary transition-all active:scale-95 disabled:opacity-60"
          >
            {busy ? 'Starting…' : 'Start my free trial'}
          </button>
        </section>
      )}

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
            <h2 className="mb-sm font-label-md text-label-md text-on-surface-variant">
              {trialAvailable ? 'Or subscribe now' : 'Choose a plan'}
            </h2>

            {offers === undefined && (
              <p className="mb-md font-body-md text-body-md text-on-surface-variant">Checking the plans…</p>
            )}
            {(offers === null || offers?.length === 0) && (
              <p className="mb-md rounded-xl bg-surface-container p-md font-body-md text-caption text-on-surface">
                The plans couldn&rsquo;t be loaded just now. Check your connection, then tap
                &ldquo;Check again&rdquo; below.
              </p>
            )}

            {offers && offers.length > 0 && (
              <div role="radiogroup" aria-label="Plans" className="mb-md space-y-sm">
                {offers.map((o) => {
                  const selected = o.id === chosen
                  const { perMonth, saving } = planValue(o, offers)
                  const best = o.id === 'annual' && saving !== null
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setChosen(o.id)}
                      className={`flex w-full items-center gap-md rounded-2xl p-md text-left transition-all active:scale-[0.98] ${
                        selected
                          ? 'bg-inverse-surface text-inverse-on-surface shadow-card'
                          : 'bg-surface-container text-on-surface'
                      }`}
                    >
                      <Icon
                        name={selected ? 'check_circle' : 'radio_button_unchecked'}
                        className="shrink-0 text-[22px]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-xs">
                          <span className="font-label-md text-body-md font-bold">{PLANS[o.id].label}</span>
                          {best && (
                            <span className="rounded-full bg-secondary px-sm py-[2px] font-label-md text-[11px] font-bold text-on-secondary">
                              Best value
                            </span>
                          )}
                        </span>
                        <span className="block font-body-md text-caption opacity-80">
                          {PLANS[o.id].duration}
                          {perMonth ? ` · ${perMonth}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-headline-md text-body-lg font-bold">
                          {formatAmount(o.amount, o.currency)}
                        </span>
                        {saving && <span className="block font-label-md text-[12px] font-bold">{saving}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <p className="mb-lg font-body-md text-caption text-on-surface-variant">
              Paid by card on Paystack&rsquo;s secure page, and renewed every{' '}
              {offer ? PLANS[offer.id].duration.replace(/^1 /, '') : 'period'} at the plan&rsquo;s
              price until you cancel. Cancel any time from My Hair Profile; you keep access to the
              end of the period you paid for. We email you before a plan renews.
              {endsISO && (
                <>
                  {' '}
                  You are open until {longDate(endsISO)}; a plan you choose now starts the day you pay.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={pay}
              disabled={busy || !offer}
              className="mb-sm flex w-full items-center justify-center gap-sm rounded-full bg-secondary py-4 font-label-md text-body-lg font-bold text-on-secondary shadow-card transition-all active:scale-95 disabled:opacity-60"
            >
              <Icon name="open_in_new" className="text-[20px]" />
              {busy
                ? 'Opening Paystack…'
                : offer
                  ? `Subscribe — ${formatAmount(offer.amount, offer.currency)} for ${PLANS[offer.id].duration}`
                  : 'Subscribe with Paystack'}
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
              By starting a trial or subscribing you agree to the{' '}
              <Link to="/legal/terms" className="text-primary underline">
                Terms of Service
              </Link>{' '}
              and the{' '}
              <Link to="/legal/privacy" className="text-primary underline">
                Privacy Policy
              </Link>
              .
            </p>
            {open ? (
              <Link
                to="/sos"
                className="mx-auto flex w-fit items-center gap-xs font-body-md text-caption text-on-surface-variant underline"
              >
                Not now — back to the app
              </Link>
            ) : (
              <button
                type="button"
                onClick={signOut}
                className="mx-auto flex items-center gap-xs font-body-md text-caption text-on-surface-variant underline"
              >
                <Icon name="logout" className="text-[16px]" />
                Sign out, or use a different email
              </button>
            )}
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
