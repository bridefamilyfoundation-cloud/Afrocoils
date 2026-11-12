import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { expiryNotice } from '../lib/membership'
import { useHairProfile } from '../lib/profile-store'

/**
 * The in-app reminder: a trial or a plan that will not renew with three
 * days or less left, a failed renewal, or the grace days after the end
 * (`expiryNotice` decides). It sits at the top of every screen except
 * the two where the membership is already the subject and the front
 * page, whose first viewport is the collage and the title and nothing
 * else (CLAUDE.md, "Hair SOS is also the front page"). Closing it
 * hides it until the app is next opened — it is a reminder, not a wall.
 * The same moments are also emailed (billing/reminders), because a
 * banner only reaches someone who opens the app.
 */
let dismissedThisSession = ''

const HIDDEN_ON = new Set(['/join', '/profile', '/', '/home', '/sos'])

export default function MembershipNotice() {
  const { profile } = useHairProfile()
  const { pathname } = useLocation()
  const notice = expiryNotice(profile.membership)
  const [dismissed, setDismissed] = useState(dismissedThisSession)

  if (!notice || HIDDEN_ON.has(pathname)) return null
  if (dismissed === notice.text) return null

  const to = notice.action === 'choose' ? '/join' : '/profile?open=membership'
  const close = () => {
    dismissedThisSession = notice.text
    setDismissed(notice.text)
  }

  return (
    <aside
      aria-label="Membership reminder"
      className={`mb-lg flex items-start gap-md rounded-2xl p-md shadow-card ${
        notice.tone === 'warn' ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container-lowest text-on-surface'
      }`}
    >
      <Icon name={notice.tone === 'warn' ? 'warning' : 'schedule'} className="mt-[2px] shrink-0 text-[22px]" />
      <div className="min-w-0 flex-1">
        <p className="mb-sm font-body-md text-body-md">{notice.text}</p>
        <Link
          to={to}
          className="inline-flex items-center gap-xs rounded-full bg-secondary px-md py-2 font-label-md text-label-md font-bold text-on-secondary transition-all active:scale-95"
        >
          {notice.action === 'choose' ? 'Choose a plan' : 'Check my membership'}
          <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      </div>
      <button type="button" onClick={close} aria-label="Hide this reminder" className="shrink-0 rounded-full p-xs opacity-80">
        <Icon name="close" className="text-[20px]" />
      </button>
    </aside>
  )
}
