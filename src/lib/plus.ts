import { createContext, useContext } from 'react'

/**
 * AfroCoils Plus: what is free, what is locked, and the hook screens use.
 *
 * One rule decides the split: **depth is paid, rescue and safety are
 * not.** Hair SOS, Quick Hairstyle, Hair Care, the Quick Hair Check, Ask,
 * the profile and the quiz are never locked, and neither is any chapter
 * that tells someone when to stop and see a professional. A person mid
 * hair-emergency is never shown a price.
 *
 * Locked things stay visible. A locked chapter shows its title and its
 * first lines, a locked look its front picture and description, so the
 * user can see what exists before being asked to pay for it. And nothing
 * the user entered is ever locked — their length checks are always
 * theirs to read; only the analysis of them is Plus.
 *
 * The sheet is opened two ways. `open` is a tap on a lock and always
 * shows. `offer` is the app suggesting it at a moment of value (the
 * second length check), and shows at most once per launch: someone who
 * closes it is not asked again until the next one.
 */

/** Locs World chapters anyone can read. Every other chapter is Plus. */
const FREE_LOC_CHAPTERS: ReadonlySet<string> = new Set([
  'basics',
  'starting',
  'scalp',
  // Troubleshooting is rescue, and rescue is free.
  'problems',
  // The escalation path. Never behind a price.
  'professional',
])

export function locChapterFree(chapterId: string): boolean {
  return FREE_LOC_CHAPTERS.has(chapterId)
}

/** The lookbook group anyone can see in full: how to start locs. */
export const FREE_LOOKBOOK_GROUP = 'Starting locs'

export function locStyleFree(group: string): boolean {
  return group === FREE_LOOKBOOK_GROUP
}

/**
 * Whether an Ask result quotes a locked Locs World section. Ask still
 * finds it — pretending no answer exists would be worse — but shows the
 * title and first line rather than the whole passage.
 */
export function askDocLocked(docId: string, unlocked: boolean): boolean {
  if (unlocked) return false
  const chapter = /^loc:([^:]+):/.exec(docId)?.[1]
  return chapter !== undefined && !locChapterFree(chapter)
}

/** How many recommended styles show before the rest are Plus. */
export const FREE_RECOMMENDATIONS = 2

/** What the user was reaching for when the sheet opened. Sets its first line. */
export type PlusTrigger =
  | 'locs'
  | 'lookbook'
  | 'growth'
  | 'reminders'
  | 'recommended'
  | 'ask'
  | 'manage'

export interface PlusContextValue {
  unlocked: boolean
  /** A tap on a lock: always opens. */
  open: (trigger: PlusTrigger) => void
  /** The app suggesting Plus: opens at most once per launch. */
  offer: (trigger: PlusTrigger) => void
}

export const PlusContext = createContext<PlusContextValue | null>(null)

export function usePlus(): PlusContextValue {
  const value = useContext(PlusContext)
  if (!value) throw new Error('usePlus must be used inside <PlusProvider>')
  return value
}
