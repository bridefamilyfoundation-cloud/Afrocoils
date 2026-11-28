import { Link } from 'react-router-dom'
import BrandLockup from './BrandMark'
import SocialIcon from './SocialIcon'
import { FOUNDER, PLATFORM_LABEL, founderLinkGroups } from '../content/founder'

const LINKS = [
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/legal/privacy', label: 'Privacy Policy' },
  { to: '/legal/terms', label: 'Terms of Service' },
  { to: '/legal/contact', label: 'Contact Us' },
]

/**
 * The prototype's footer branded this with another name and its app bar
 * said something else again. Both now draw the same <BrandLockup>, so there is
 * no longer a second copy of the name to fall out of step.
 */
/**
 * Locked: only the pages a non-member can open — Privacy, Terms, Contact.
 *
 * The founder's social links sit here too, in their two groups, because
 * her card is on About, which only members can open, and the footer is
 * on every screen. They are read from `content/founder.ts`, like the
 * card, so the two cannot list different accounts.
 */
export default function AppFooter({ locked = false }: { locked?: boolean }) {
  const links = locked ? LINKS.filter((link) => link.to.startsWith('/legal/')) : LINKS
  const groups = founderLinkGroups()
  const firstName = FOUNDER.name.split(' ')[0]
  return (
    <footer className="mt-2xl flex w-full flex-col items-center gap-md bg-surface-container-highest px-container-padding py-xl md:flex-row md:justify-between">
      <div className="flex flex-col items-center md:items-start">
        <Link to="/sos" className="mb-xs">
          <BrandLockup size="sm" />
        </Link>
        <p className="font-caption text-caption text-on-surface-variant">
          AfroCoils — Celebrating Every Coil.
        </p>
        <p className="font-caption text-caption text-on-surface-variant">
          A product of Crown Space Limited.
        </p>
        {groups.length > 0 && (
          <div className="mt-md flex flex-wrap justify-center gap-lg md:justify-start">
            {groups.map((group) => (
              <div key={group.id} className="flex flex-col items-center md:items-start">
                <p className="mb-xs font-label-md text-caption font-bold uppercase tracking-widest text-on-surface-variant">
                  {group.title}
                </p>
                <ul className="flex gap-sm">
                  {group.links.map((link) => (
                    <li key={link.platform}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${firstName} on ${PLATFORM_LABEL[link.platform]} (${group.title})`}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface shadow-card transition-all active:scale-90"
                      >
                        <SocialIcon platform={link.platform} className="h-5 w-5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="flex flex-wrap justify-center gap-lg">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="font-body-md text-body-md text-on-surface-variant transition-colors active:scale-95"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  )
}
