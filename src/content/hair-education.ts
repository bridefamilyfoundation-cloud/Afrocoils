import type { HairType } from '../lib/types'
import { HAIR_GUIDE, chapterHairTypes, type HairGuideChapter } from './hair-guide'

/**
 * Hair Education (`/care/learn`): the teaching half of the AfroCoils
 * Hair Guide, read one lesson at a time.
 *
 * The guide is two things in one document — an education in what 4C
 * hair is and why it behaves as it does, and a starter kit of routines,
 * shopping and a first wash day. This is the first of those on its own
 * page. It holds no prose of its own: a lesson *is* a guide chapter,
 * looked up by id, so the two pages can never say different things and
 * an edit to `hair-guide.ts` reaches both. The only sentences here are
 * the fixed lines that introduce the page.
 *
 * The practical chapters (styling, routine, products, starter kit, first
 * wash day, troubleshooting) stay in the guide, which the last lesson
 * points on to.
 */

/** Guide chapters that are lessons, in teaching order. */
export const LESSON_IDS = [
  'how-to-use',
  'understand',
  'characteristics',
  'shrinkage-shedding-breakage',
  'cleanse-condition',
  'moisture-layering',
  'oils',
  'protect',
  'glossary',
] as const

export const HAIR_EDUCATION_TITLE = 'Hair Education'
export const HAIR_EDUCATION_INTRO =
  'What 4C hair is and why it behaves the way it does, in short lessons from the AfroCoils Hair Guide. Read them in order, or open the one you need.'

/** The chapter used as the opening, read before lesson one. */
export const OPENING_LESSON = 'how-to-use'

/**
 * Lessons for a hair type, in order. Loose-hair chapters are left out
 * for a loc wearer exactly as the guide leaves them out.
 */
export function lessonsFor(hairType: HairType | undefined): HairGuideChapter[] {
  return LESSON_IDS.map((id) => HAIR_GUIDE.find((c) => c.id === id))
    .filter((c): c is HairGuideChapter => c !== undefined)
    .filter((c) => !hairType || chapterHairTypes(c).includes(hairType))
}

/** Every lesson, whoever reads it — for titles, which know no profile. */
export function lessonById(id: string): HairGuideChapter | undefined {
  return (LESSON_IDS as readonly string[]).includes(id)
    ? HAIR_GUIDE.find((c) => c.id === id)
    : undefined
}
