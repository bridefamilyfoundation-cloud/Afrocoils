/**
 * Meet the Founder: who she is, in her own words, and where to find her.
 *
 * One file for the app's About screen and the landing site, so the two
 * cannot say different things. Like every other word in the app, the
 * biography is written by a person: it is the founder's own copy, put
 * here as she supplied it, and nothing here is drafted on her behalf.
 *
 * The copy below is the owner's, as supplied on 2026-11-22, word for
 * word: the biography, the "socially known as" line and the invitation
 * above the links. Two things were normalised and nothing else: the
 * closing line uses the app's own form of the tagline (the footer's),
 * and the links are stored without the share-tracking parameters they
 * arrived with (`_r`, `_t`, `si`, `bqrl`, `dmpr`, `utm_source`), which
 * identify the share, not the account.
 *
 * **Still to come:** her photograph. Save it as
 * `src/assets/images/founder.webp` (or .jpg / .png); nothing else needs
 * touching, the slot finds the file. Until then the app draws its usual
 * placeholder and the site her initials.
 *
 * The section is drawn only while `bio` has a paragraph
 * (`founderReady`). A link whose address is empty or not on its own
 * platform is not shown, and a group with no links is left out.
 */

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube'

export interface FounderLink {
  platform: SocialPlatform
  /** The account's full address. Empty: not supplied yet, so not shown. */
  url: string
}

export interface FounderLinkGroup {
  id: 'business' | 'personal'
  title: string
  links: FounderLink[]
}

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
}

/** The hosts each platform's links may point at. Anything else is not a link the app will draw. */
const PLATFORM_HOSTS: Record<SocialPlatform, string[]> = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
}

export const FOUNDER = {
  name: 'Rachel Ehigocho Majerison',
  title: 'Founder & Creative Director, AfroCoils',
  /** The image slot: `src/assets/images/founder.<ext>`. */
  photo: 'founder',
  photoAlt: 'Rachel Ehigocho Majerison, founder and creative director of AfroCoils',
  /** The line under her title. */
  aka: 'Socially known as heart_racheal',
  /** Her biography and introduction, a paragraph to a string. */
  bio: [
    'AfroCoils was born out of a passion for natural hair and a desire to help women better understand, appreciate and care for their natural hair.',
    'What started as an interest in sharing knowledge about natural hair, particularly Type 4 hair, gradually grew into a bigger vision: to create a platform where women could learn about their hair, discover suitable and sustainable hair-care practices, and find hairstyles and routines that work for them.',
    'Rachel envisioned AfroCoils as more than just a hairstyling platform. She wanted to create a space that empowers women with the knowledge and tools to understand their unique hair characteristics, make informed hair-care decisions and embrace their natural hair with confidence.',
    'Through AfroCoils, she hopes to make natural hair education more accessible, practical and personalised, helping women move beyond simply styling their hair to truly understanding and appreciating it.',
  ] as string[],
  /** The line the biography closes on: the brand's tagline, as the footer has it. */
  tagline: 'AfroCoils — Celebrating Every Coil.',
  /** The invitation above the links. */
  connect: {
    heading: 'Connect with Racheal',
    body: 'Want to connect with the founder beyond AfroCoils? Follow Racheal’s creative journey, business ventures, personal lifestyle and natural hair experiences across her social platforms.',
  },
  groups: [
    {
      id: 'business',
      title: 'Founder & Business',
      links: [
        { platform: 'tiktok', url: 'https://www.tiktok.com/@crown_space_limited' },
        { platform: 'instagram', url: 'https://www.instagram.com/crown_space_limited' },
      ],
    },
    {
      id: 'personal',
      title: 'Personal & Lifestyle',
      links: [
        { platform: 'tiktok', url: 'https://www.tiktok.com/@heart_racheal' },
        { platform: 'instagram', url: 'https://www.instagram.com/heart_racheal' },
        { platform: 'youtube', url: 'https://youtube.com/@heartracheal' },
      ],
    },
  ] as FounderLinkGroup[],
}

/** Whether there is a section to draw yet: the biography has been supplied. */
export function founderReady(): boolean {
  return FOUNDER.bio.some((paragraph) => paragraph.trim().length > 0)
}

/**
 * Whether an address is one this platform's icon may open: `https`, and
 * on the platform's own site. A typo or a pasted tracking redirect is
 * left out rather than drawn as an icon that goes somewhere else.
 */
export function validFounderLink(link: FounderLink): boolean {
  try {
    const url = new URL(link.url)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.replace(/^(www|m|vm)\./, '')
    return PLATFORM_HOSTS[link.platform].includes(host)
  } catch {
    return false
  }
}

/** The groups that have at least one link to show, each with only those links. */
export function founderLinkGroups(): FounderLinkGroup[] {
  return FOUNDER.groups
    .map((group) => ({ ...group, links: group.links.filter(validFounderLink) }))
    .filter((group) => group.links.length > 0)
}
