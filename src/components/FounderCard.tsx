import { slot } from '../assets/imagery'
import {
  FOUNDER,
  PLATFORM_LABEL,
  founderLinkGroups,
  founderReady,
} from '../content/founder'
import PrototypeImage from './PrototypeImage'
import SocialIcon from './SocialIcon'

/**
 * Meet the Founder, on About: her photograph, name and title, her own
 * introduction, and where to find her, in two groups.
 *
 * Everything shown is read from `content/founder.ts`, which the landing
 * site reads too. Nothing is drawn until her biography is there; a link
 * that has not been supplied is not shown.
 *
 * The three marks are `SocialIcon`, shared with the footer, which
 * carries the same links on every screen (About is members-only).
 * Tapping one opens the account in the phone's browser; the app sends
 * nothing with it.
 */

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
