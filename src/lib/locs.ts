import type { HairIdentity, LocMethod, LocStage, LocType } from './types'
import { LOC_STAGES } from './types'

/**
 * Loc-journey maths.
 *
 * Pure functions, kept out of the screens for the same reason the growth
 * maths is: the stage estimate is a claim about someone's hair that they
 * may well disagree with, so it should be readable and testable on its
 * own rather than buried in JSX.
 */

/* ------------------------------------------------------------------ *
 * Stage
 * ------------------------------------------------------------------ */

/**
 * Months into the journey at which each stage typically begins.
 *
 * These are wide, and deliberately so. How fast locs bud depends on curl
 * pattern, method, retwist frequency and how much the wearer fiddles with
 * them — a 4C freeform head can be budding at three months while
 * interlocked microlocs on 3C hair still look starter at six. The app
 * treats this as an estimate, labels it as one, and lets the user
 * override it; it never contradicts the wearer about their own hair.
 */
const STAGE_ONSET_MONTHS: Record<LocStage, number> = {
  Starter: 0,
  Budding: 3,
  Teen: 6,
  Mature: 15,
  Rooted: 24,
}

const DAYS_PER_MONTH = 30.44

/** Months between an ISO date and now. Future dates yield 0. */
export function monthsSince(iso: string): number {
  const start = Date.parse(iso)
  if (Number.isNaN(start)) return 0
  return Math.max(0, (Date.now() - start) / (DAYS_PER_MONTH * 86_400_000))
}

/**
 * Estimate the stage from the install date.
 *
 * Returns undefined when there is no usable start date rather than
 * guessing "Starter" — a wrong stage drives wrong advice about washing
 * and retwisting, which is exactly where new loc wearers get hurt.
 */
export function deriveLocStage(locStartISO: string | undefined): LocStage | undefined {
  if (!locStartISO) return undefined
  const months = monthsSince(locStartISO)

  // Walk from the oldest stage back, so the first match is the latest
  // stage the age qualifies for.
  for (let i = LOC_STAGES.length - 1; i >= 0; i--) {
    const stage = LOC_STAGES[i]
    if (months >= STAGE_ONSET_MONTHS[stage]) return stage
  }
  return 'Starter'
}

export interface LocStageInfo {
  stage?: LocStage
  /** True when the stage came from the date rather than from the user. */
  estimated: boolean
  /** Whole months since install, when known. */
  ageMonths?: number
}

/**
 * The stage to act on: the user's own answer wins over the estimate.
 *
 * Someone who has told us they are budding is budding, even if the
 * arithmetic on their install date disagrees — they can see their own
 * hair and we cannot.
 */
export function resolveLocStage(identity: HairIdentity): LocStageInfo {
  const ageMonths = identity.locStartISO
    ? Math.floor(monthsSince(identity.locStartISO))
    : undefined

  if (identity.locStage) return { stage: identity.locStage, estimated: false, ageMonths }
  return { stage: deriveLocStage(identity.locStartISO), estimated: true, ageMonths }
}

/** "1 yr 4 mo" — the granularity people actually describe loc age in. */
export function formatLocAge(months: number): string {
  if (months < 1) return 'Less than a month'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  const rest = months % 12
  const y = `${years} yr${years === 1 ? '' : 's'}`
  return rest === 0 ? y : `${y} ${rest} mo`
}

/* ------------------------------------------------------------------ *
 * Maintenance cadence
 * ------------------------------------------------------------------ */

/**
 * Suggested weeks between root maintenance, by method and stage.
 *
 * Interlocking holds far longer than palm rolling and is far less
 * forgiving of being done often — interlocking every three weeks is how
 * people thin their own roots out. Freeform has no cadence at all by
 * definition, so it returns undefined rather than a number.
 */
export function retwistWeeks(
  method: LocMethod | undefined,
  stage: LocStage | undefined,
): number | undefined {
  if (method === 'Freeform') return undefined

  const base = method === 'Interlocking' ? 8 : 6
  // Starter locs want the longest gap of all: every retwist is a chance
  // for a section that has not locked yet to slip.
  if (stage === 'Starter') return base + 2
  if (stage === 'Mature' || stage === 'Rooted') return base + 2
  return base
}

/** Human label for the loc setup, e.g. "Interlocking · Microlocs". */
export function describeLocs(identity: HairIdentity): string {
  const { locType, locMethod } = identity
  if (!locMethod) return locType ? `${locType} locs` : 'Locs'
  return `${locMethod} · ${locType ?? 'Locs'}`
}

export function isLocs(identity: HairIdentity | undefined): boolean {
  return identity?.hairType === 'Locs'
}

export type { LocMethod, LocStage, LocType }
