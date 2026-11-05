import { useEffect, useRef } from 'react'
import { MembershipError, checkStatus, dueForCheck, hasAccess, toMembership } from '../lib/membership'
import { useHairProfile } from '../lib/profile-store'

/**
 * Keeps the phone's copy of the membership current. Draws nothing.
 *
 * Asks the server on launch and whenever the app comes back to the
 * front — every time while the app is locked (someone who has just paid
 * on Paystack's page is coming back to see it open), and at most every
 * `RECHECK_HOURS` while it is open. No signal is not an error: the last
 * answer stands, so a paid member keeps the app offline. A 401 means the
 * token is no good any more, and signs the phone out; the hair profile
 * itself is untouched.
 */
export default function MembershipSync() {
  const { profile, ready, update } = useHairProfile()
  const membership = useRef(profile.membership)
  membership.current = profile.membership
  const busy = useRef(false)

  useEffect(() => {
    if (!ready) return

    async function check(onResume: boolean) {
      const current = membership.current
      if (!current || busy.current) return
      const open = hasAccess(current)
      if (open && !dueForCheck(current)) return
      if (!open && !onResume && !dueForCheck(current)) return
      busy.current = true
      try {
        update({ membership: toMembership(await checkStatus(current.token)) })
      } catch (error) {
        if (error instanceof MembershipError && error.status === 401) update({ membership: undefined })
      } finally {
        busy.current = false
      }
    }

    void check(true)
    const onVisible = () => document.visibilityState === 'visible' && void check(true)
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [ready, update])

  return null
}
