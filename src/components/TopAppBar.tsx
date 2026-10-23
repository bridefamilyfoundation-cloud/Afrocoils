import { Link } from 'react-router-dom'
import { IMAGERY } from '../assets/imagery'
import BrandLockup from './BrandMark'
import Icon from './Icon'
import PrototypeImage from './PrototypeImage'
import UserPhoto from './UserPhoto'
import { useHairProfile } from '../lib/profile-store'

export default function TopAppBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { profile } = useHairProfile()
  const { name, photo } = profile.bio
  return (
    // A minimum height, not a fixed one. `pt-safe` adds the status-bar
    // inset as padding, and padding cannot grow a fixed-height box — it
    // pushed the menu button, the lockup and the avatar down inside the
    // same 64px and clipped them on every device with a cutout.
    //
    // Written as an arbitrary value because Tailwind's `minHeight` scale
    // carries no spacing steps: `min-h-16` compiles to nothing at all,
    // which would drop the bar's height rather than fix it.
    //
    // Three columns rather than space-between, so the lockup stays centred
    // with two buttons on the right and one on the left.
    <header className="app-chrome fixed top-0 left-0 z-50 grid min-h-[4rem] w-full grid-cols-[1fr_auto_1fr] items-center bg-surface-container-low/70 px-gutter pt-safe backdrop-blur-md">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        data-tour="menu-button"
        className="flex h-10 w-10 items-center justify-center justify-self-start rounded-full bg-surface-container-lowest shadow-card transition-all active:scale-90"
      >
        <Icon name="menu" className="text-primary" />
      </button>

      {/* The name never travels without the mark. `/sos` is the front
          page as well as the section now, so this lands on the same
          screen a launch does. */}
      <Link to="/sos" className="transition-all hover:opacity-80">
        <BrandLockup size="sm" />
      </Link>

      <div className="flex items-center gap-sm justify-self-end">
        {/* Ask moved to the floating button at the bottom right
            (components/AskLauncher), where a thumb already is. */}
        {/* The user's own photo once they have set one. There is no auth
            and no account here — the photo is a file on this device, so
            this is as personal as the app gets and as personal as it needs
            to be. */}
        <Link to="/profile" aria-label={name ? `${name}'s profile` : 'Your profile'}>
          {photo ? (
            <UserPhoto
              path={photo}
              alt={name ? `${name}'s profile photo` : 'Your profile photo'}
              rounded="rounded-full"
              className="h-10 w-10 border-2 border-primary-fixed"
            />
          ) : (
            <PrototypeImage
              slot={IMAGERY.avatar}
              rounded="rounded-full"
              className="h-10 w-10 border-2 border-primary-fixed"
            />
          )}
        </Link>
      </div>
    </header>
  )
}
