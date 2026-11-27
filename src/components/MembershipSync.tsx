import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import {
  MembershipError,
  checkStatus,
  checkoutRecentlyOpened,
  dueForCheck,
  hasAccess,
  markCheckoutOpened,
  onSessionRenewed,
  toMembership,
} from '../lib/membership'
import { useHairProfile } from '../lib/profile-store'
import { RETURN_HOST, RETURN_SCHEME } from '../lib/types'

/** Whether the app was opened by the link Paystack's return route sends the browser to. */
const isReturn = (url: string | undefined) => url?.startsWith(`${RETURN_SCHEME}://${RETURN_HOST}`) === true

/**
 * Keeps the phone's copy of the membership current. Draws nothing.
 *
 * Asks the server on launch and whenever the app comes back to the
 * front — every time while the app is locked (someone who has just paid
 * on Paystack's page is coming back to see it open), and at most every
 * `RECHECK_HOURS` while it is open — except straight after a Paystack
 * checkout was opened, when someone on the trial is coming back to see
 * their plan start. No signal is not an error: the last
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
      const justPaid = onResume && checkoutRecentlyOpened()
      if (open && !justPaid && !dueForCheck(current)) return
      if (!open && !onResume && !dueForCheck(current)) return
      busy.current = true
      try {
        update({ membership: toMembership(await checkStatus(current)) })
      } catch (error) {
        if (error instanceof MembershipError && error.status === 401) update({ membership: undefined })
      } finally {
        busy.current = false
      }
    }

    // Every refreshed pair goes onto the profile at once: the refresh
    // token it replaced is already spent.
    const stopListening = onSessionRenewed((session) =>
      update((now) => (now.membership?.email === session.email ? { membership: { ...now.membership, ...session } } : {})),
    )

    void check(true)
    const onVisible = () => document.visibilityState === 'visible' && void check(true)
    document.addEventListener('visibilitychange', onVisible)

    /*
     * Opened by the return link: someone has just paid. That is the same
     * signal as coming back after opening a checkout, and it has to be
     * given here because the app may have been closed in the meantime,
     * which loses the in-memory note that a checkout was opened. Nothing
     * is read from the link beyond the fact of it.
     */
    const returned = (url: string | undefined) => {
      if (!isReturn(url)) return
      markCheckoutOpened()
      void check(true)
    }
    const native = Capacitor.isNativePlatform()
    if (native) void App.getLaunchUrl().then((launch) => returned(launch?.url)).catch(() => undefined)
    const listener = native ? App.addListener('appUrlOpen', ({ url }) => returned(url)) : undefined

    return () => {
      stopListening()
      document.removeEventListener('visibilitychange', onVisible)
      void listener?.then((handle) => handle.remove())
    }
  }, [ready, update])

  return null
}
