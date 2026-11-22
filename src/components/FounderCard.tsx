import { slot } from '../assets/imagery'
import {
  FOUNDER,
  PLATFORM_LABEL,
  founderLinkGroups,
  founderReady,
  type SocialPlatform,
} from '../content/founder'
import PrototypeImage from './PrototypeImage'

/**
 * Meet the Founder, on About: her photograph, name and title, her own
 * introduction, and where to find her, in two groups.
 *
 * Everything shown is read from `content/founder.ts`, which the landing
 * site reads too. Nothing is drawn until her biography is there; a link
 * that has not been supplied is not shown.
 *
 * The three marks are drawn here as inline SVG, like the illustrations
 * in Hair Discovery: the icon font carries no brand glyphs, and the app
 * loads nothing from another origin. They take the palette's colour
 * (`currentColor`) rather than each network's own, so the row stays in
 * the four brand colours. Tapping one opens the account in the phone's
 * browser; the app sends nothing with it.
 */

function SocialIcon({ platform, className = '' }: { platform: SocialPlatform; className?: string }) {
  if (platform === 'instagram') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
      </svg>
    )
  }
  if (platform === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
        <path
          fillRule="evenodd"
          d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

export default function FounderCard() {
  if (!founderReady()) return null
  const groups = founderLinkGroups()
  const firstName = FOUNDER.name.split(' ')[0]

  return (
    <section
      id="about-founder"
      aria-labelledby="founder-heading"
      className="mb-2xl scroll-mt-28 overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-float ring-1 ring-outline-variant/40"
    >
      {/* The head of the card is espresso with cream type: the one dark
          block on a page of cream and white, which is what makes it the
          thing the eye lands on. Her photograph sits large in it, on a
          cream ring. */}
      <div className="relative overflow-hidden bg-inverse-surface px-lg pb-xl pt-lg text-center text-inverse-on-surface sm:flex sm:items-end sm:gap-xl sm:p-xl sm:text-left">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-secondary/25 blur-2xl"
        />
        <PrototypeImage
          slot={slot(FOUNDER.photo, FOUNDER.photoAlt)}
          seed="founder"
          icon="face_3"
          rounded="rounded-[1.75rem]"
          ratio={[4, 5]}
          className="relative mx-auto mb-lg aspect-[4/5] w-56 shrink-0 object-cover object-top shadow-float ring-4 ring-inverse-on-surface/90 sm:mx-0 sm:mb-0 sm:w-60"
        />

        <div className="relative min-w-0 flex-1">
          <p className="mb-sm inline-block rounded-full bg-secondary px-md py-1 font-label-md text-caption font-bold uppercase tracking-[0.18em] text-on-secondary">
            Meet the Founder
          </p>
          <h2
            id="founder-heading"
            className="font-display-lg text-headline-lg leading-tight text-inverse-on-surface"
          >
            {FOUNDER.name}
          </h2>
          <p className="mt-xs font-label-md text-body-md font-bold text-inverse-primary">{FOUNDER.title}</p>
          <p className="mt-xs font-body-md text-caption text-inverse-on-surface/80">{FOUNDER.aka}</p>
        </div>
      </div>

      <div className="space-y-md p-lg sm:p-xl">
        {FOUNDER.bio.map((paragraph) => (
          <p key={paragraph} className="font-body-md text-body-md text-on-surface-variant">
            {paragraph}
          </p>
        ))}
        <p className="font-headline-md text-body-lg font-bold text-primary">{FOUNDER.tagline}</p>
      </div>

      {groups.length > 0 && (
        <div className="bg-primary-fixed/50 p-lg text-center sm:p-xl sm:text-left">
          <h3 className="mb-xs font-headline-md text-body-lg font-bold text-on-surface">
            {FOUNDER.connect.heading}
          </h3>
          <p className="mb-lg font-body-md text-body-md text-on-surface-variant">{FOUNDER.connect.body}</p>

          <div className="grid gap-lg sm:grid-cols-2">
            {groups.map((group) => (
              <div key={group.id}>
                <h4 className="mb-sm font-label-md text-caption font-bold uppercase tracking-widest text-on-surface">
                  {group.title}
                </h4>
                <ul className="flex justify-center gap-sm sm:justify-start">
                  {group.links.map((link) => (
                    <li key={link.platform}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${firstName} on ${PLATFORM_LABEL[link.platform]} (${group.title})`}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface shadow-card transition-all active:scale-90"
                      >
                        <SocialIcon platform={link.platform} className="h-5 w-5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
