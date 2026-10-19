import { Link } from 'react-router-dom'
import Icon from './Icon'

/**
 * "Part of Growth", at the top of a screen that used to be a tab.
 *
 * The calendar and the product shelf both lost their place in the bottom
 * nav when the app collapsed to four sections. They still carry the tab
 * chrome, because they are full screens rather than pushed detail views —
 * which leaves nothing on them saying where they now belong, or how to
 * get back to the screen that sent you. This says both.
 */
export default function SectionCrumb({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-md inline-flex items-center gap-xs rounded-full bg-surface-container-high px-md py-1.5 font-label-md text-caption text-on-surface-variant transition-all active:scale-95"
    >
      <Icon name="chevron_left" className="text-[16px]" />
      Part of {label}
    </Link>
  )
}
