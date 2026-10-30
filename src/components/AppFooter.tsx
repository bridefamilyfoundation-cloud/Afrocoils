import { Link } from 'react-router-dom'
import BrandLockup from './BrandMark'

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
export default function AppFooter() {
  return (
    <footer className="mt-2xl flex w-full flex-col items-center gap-md bg-surface-container-highest px-container-padding py-xl md:flex-row md:justify-between">
      <div className="flex flex-col items-center md:items-start">
        <Link to="/sos" className="mb-xs">
          <BrandLockup size="sm" />
        </Link>
        <p className="font-caption text-caption text-on-surface-variant">
          AfroCoils — Celebrating Every Coil.
        </p>
      </div>

      <nav className="flex flex-wrap justify-center gap-lg">
        {LINKS.map((link) => (
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
