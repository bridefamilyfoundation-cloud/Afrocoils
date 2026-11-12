import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import {
  MembershipError,
  accessEndsISO,
  autoRenews,
  daysLeft,
  hasAccess,
  longDate,
  manageUrl,
  onTrial,
  openExternal,
} from '../lib/membership'
import { useHairProfile } from '../lib/profile-store'
import { PLANS, TRIAL_DAYS, type Membership } from '../lib/types'

/**
 * The membership, in the last row of My Hair Profile: which email, which
 * plan, how long it runs, when it started and when it renews or ends,
 * and what a member can do about it — choose a plan (on the trial, or a
 * plan that will not renew), manage the subscription on Paystack's page
 * (card, cancel), and sign this phone out. Signing out keeps the hair
 * profile on the phone; signing back in with the same email opens it
 * again.
 */

interface Detail {
  label: string
  value: string
}

function details(m: Membership, now: Date = new Date()): Detail[] {
  const ends = accessEndsISO(m, now)
  const open = hasAccess(m, now)
  const renews = autoRenews(m, now)
  const left = daysLeft(ends, now)
  const leftLine = open && ends ? ` · ${left} day${left === 1 ? '' : 's'} left` : ''

  if (onTrial(m, now)) {
    const started = new Date(Date.parse(m.trialEndsISO!) - TRIAL_DAYS * 86_400_000).toISOString()
    return [
      { label: 'Plan', value: 'Free trial' },
      { label: 'Length', value: `${TRIAL_DAYS} days, no card` },
      { label: 'Started', value: longDate(started) },
      { label: 'Ends', value: `${longDate(m.trialEndsISO!)}${leftLine}` },
    ]
  }

  const rows: Detail[] = [
    {
      label: 'Plan',
      value: m.plan ? PLANS[m.plan].label : m.paidUntilISO ? 'Membership given by AfroCoils' : 'No plan yet',
    },
  ]
  if (m.plan) {
    rows.push({
      label: 'Length',
      value: `${PLANS[m.plan].duration}, ${renews ? 'renews automatically' : 'not renewing'}`,
    })
  }
  if (m.periodStartISO) rows.push({ label: 'Started', value: longDate(m.periodStartISO) })
  if (ends) {
    rows.push({
      label: !open ? 'Ended' : renews ? 'Renews on' : 'Expires on',
      value: `${longDate(ends)}${leftLine}`,
    })
  }
  return rows
}

/**
 * `embedded` drops the card and its heading, for the profile's
 * Membership row, which already names it and shows the email.
 */
export default function MembershipCard({ embedded = false }: { embedded?: boolean }) {
  const { profile, update } = useHairProfile()
  const membership = profile.membership
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOut, setConfirmOut] = useState(false)
  if (!membership) return null

  async function manage() {
    if (!membership) return
    setBusy(true)
    setError(null)
    try {
      openExternal(await manageUrl(membership.token))
    } catch (e) {
      setError(e instanceof MembershipError ? e.message : 'Couldn’t open Paystack. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const choosing = !autoRenews(membership)

  return (
    <section
      aria-labelledby={embedded ? undefined : 'membership'}
      aria-label={embedded ? 'Membership' : undefined}
      className={embedded ? '' : 'mt-2xl rounded-2xl bg-surface-container-lowest p-lg shadow-card'}
    >
      {embedded ? (
        <p className="mb-xs truncate font-body-md text-caption text-on-surface-variant">{membership.email}</p>
      ) : (
        <div className="mb-md flex items-center gap-md">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-on-secondary">
            <Icon name="workspace_premium" className="text-[22px]" />
          </span>
          <div className="min-w-0">
            <h2 id="membership" className="font-headline-md text-body-lg font-bold text-on-surface">
              Membership
            </h2>
            <p className="truncate font-body-md text-caption text-on-surface-variant">{membership.email}</p>
          </div>
        </div>
      )}

      <dl className="mb-md divide-y divide-outline-variant/40 rounded-xl bg-surface-container px-md">
        {details(membership).map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-md py-sm">
            <dt className="shrink-0 font-label-md text-caption text-on-surface-variant">{row.label}</dt>
            <dd className="text-right font-body-md text-body-md font-bold text-on-surface">{row.value}</dd>
          </div>
        ))}
      </dl>

      {membership.status === 'attention' && (
        <p className="mb-md rounded-xl bg-error-container p-md font-body-md text-caption text-on-error-container">
          Your last renewal didn&rsquo;t go through. Paystack will try the card again; check it under
          Manage or cancel.
        </p>
      )}

      <div className="flex flex-wrap gap-sm">
        {choosing && (
          <Link
            to="/join"
            className="flex items-center gap-xs rounded-full bg-secondary px-lg py-3 font-label-md text-label-md font-bold text-on-secondary transition-all active:scale-95"
          >
            <Icon name="workspace_premium" className="text-[18px]" />
            Choose a plan
          </Link>
        )}
        {membership.plan && (
          <button
            type="button"
            onClick={() => void manage()}
            disabled={busy}
            className={`flex items-center gap-xs rounded-full px-lg py-3 font-label-md text-label-md font-bold transition-all active:scale-95 disabled:opacity-60 ${
              choosing ? 'bg-surface-container-high text-on-surface' : 'bg-secondary text-on-secondary'
            }`}
          >
            <Icon name="open_in_new" className="text-[18px]" />
            {busy ? 'Opening…' : 'Manage or cancel'}
          </button>
        )}
        {confirmOut ? (
          <button
            type="button"
            onClick={() => update({ membership: undefined })}
            className="flex items-center gap-xs rounded-full bg-error-container px-lg py-3 font-label-md text-label-md font-bold text-on-error-container transition-all active:scale-95"
          >
            <Icon name="logout" className="text-[18px]" />
            Sign out of this phone
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmOut(true)}
            className="flex items-center gap-xs rounded-full bg-surface-container-high px-lg py-3 font-label-md text-label-md font-bold text-on-surface transition-all active:scale-95"
          >
            <Icon name="logout" className="text-[18px]" />
            Sign out
          </button>
        )}
      </div>
      {confirmOut && (
        <p className="mt-sm font-body-md text-caption text-on-surface-variant">
          The app locks until you sign in again. Your hair profile, history and photos stay on this phone.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-md rounded-xl bg-error-container p-md font-body-md text-caption text-on-error-container">
          {error}
        </p>
      )}
    </section>
  )
}
