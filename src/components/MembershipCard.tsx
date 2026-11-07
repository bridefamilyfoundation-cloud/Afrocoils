import { useState } from 'react'
import Icon from './Icon'
import { MembershipError, longDate, manageUrl, openExternal } from '../lib/membership'
import { useHairProfile } from '../lib/profile-store'
import type { MemberStatus } from '../lib/types'

/**
 * The membership, in the last row of My Hair Profile: which email, until
 * when, and the two things a member can do about it — manage the
 * subscription on Paystack's page (card, cancel), and sign this phone
 * out. Signing out keeps the hair profile on the phone; signing back in
 * with the same email opens it again.
 */

const STATUS_LINE: Record<MemberStatus, (until: string | null) => string> = {
  active: (until) => (until ? `Renews on ${longDate(until)}` : 'Active'),
  'non-renewing': (until) => (until ? `Cancelled — open until ${longDate(until)}` : 'Cancelled'),
  attention: (until) =>
    until
      ? `Your last renewal didn’t go through. Paystack will try again; open until ${longDate(until)}.`
      : 'Your last renewal didn’t go through.',
  cancelled: (until) => (until ? `Open until ${longDate(until)}` : 'Cancelled'),
  none: (until) => (until ? `Open until ${longDate(until)}` : 'Not paid'),
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
      <p className="mb-lg font-body-md text-body-md text-on-surface">
        {STATUS_LINE[membership.status](membership.paidUntilISO)}
      </p>

      <div className="flex flex-wrap gap-sm">
        <button
          type="button"
          onClick={() => void manage()}
          disabled={busy}
          className="flex items-center gap-xs rounded-full bg-secondary px-lg py-3 font-label-md text-label-md font-bold text-on-secondary transition-all active:scale-95 disabled:opacity-60"
        >
          <Icon name="open_in_new" className="text-[18px]" />
          {busy ? 'Opening…' : 'Manage or cancel'}
        </button>
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
