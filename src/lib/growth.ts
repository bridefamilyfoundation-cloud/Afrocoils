import type { LengthBand, LengthCheck, LengthUnit } from './types'

/**
 * Length-check maths.
 *
 * Kept as pure functions rather than living inside the Growth screen so
 * the retention rule — the one number here a user could reasonably
 * dispute — can be read and tested on its own.
 */

export const CM_PER_IN = 2.54

/**
 * Average scalp hair growth. Roughly half an inch a month is the figure
 * the whole category quotes; it varies by person, which is exactly why
 * retention is framed below as a ratio against it rather than as a
 * verdict.
 */
export const AVG_GROWTH_IN_PER_MONTH = 0.5
const DAYS_PER_MONTH = 30.44
const AVG_GROWTH_IN_PER_DAY = AVG_GROWTH_IN_PER_MONTH / DAYS_PER_MONTH

/** Retention below this span is noise — a fortnight's growth is ~0.25". */
const MIN_DAYS_FOR_RETENTION = 28
/** Below this, the user's own growth rate is too noisy to project from. */
const MIN_DAYS_FOR_OWN_RATE = 60

export function toDisplay(inches: number, unit: LengthUnit): number {
  return unit === 'cm' ? inches * CM_PER_IN : inches
}

export function fromDisplay(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value / CM_PER_IN : value
}

export function formatLength(inches: number, unit: LengthUnit, digits = 1): string {
  return `${toDisplay(inches, unit).toFixed(digits)}${unit === 'cm' ? 'cm' : '"'}`
}

/** Oldest first. Every consumer here assumes ascending order. */
export function sortChecks(checks: LengthCheck[]): LengthCheck[] {
  return [...checks].sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO))
}

function daysBetween(fromISO: string, toISO: string): number {
  return (Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000
}

export interface GrowthStats {
  latest?: LengthCheck
  previous?: LengthCheck
  /** Inches gained since the previous check, and the gap it happened over. */
  deltaInches?: number
  deltaDays?: number
  /**
   * Share of expected growth still on the head, across the whole record.
   * Undefined until there is enough of a span to mean anything.
   */
  retention?: number
  /** The user's own measured growth, inches per month, across the record. */
  ownRateInPerMonth?: number
  totalDays?: number
}

export function deriveStats(checks: LengthCheck[]): GrowthStats {
  const sorted = sortChecks(checks)
  if (sorted.length === 0) return {}

  const latest = sorted[sorted.length - 1]
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : undefined

  const stats: GrowthStats = { latest, previous }

  if (previous) {
    stats.deltaInches = latest.overall - previous.overall
    stats.deltaDays = Math.round(daysBetween(previous.dateISO, latest.dateISO))
  }

  const first = sorted[0]
  const totalDays = daysBetween(first.dateISO, latest.dateISO)
  stats.totalDays = Math.round(totalDays)

  if (totalDays >= MIN_DAYS_FOR_RETENTION) {
    const gained = latest.overall - first.overall
    const expected = AVG_GROWTH_IN_PER_DAY * totalDays
    // `expected` cannot be zero here: totalDays is past the minimum span.
    stats.retention = gained / expected
    if (totalDays >= MIN_DAYS_FOR_OWN_RATE) {
      stats.ownRateInPerMonth = (gained / totalDays) * DAYS_PER_MONTH
    }
  }

  return stats
}

/**
 * Which length band a measurement falls in.
 *
 * The cuts are the milestone landmarks below — neck length and armpit
 * length — rather than a second set of numbers that could drift away
 * from them. Anything shorter than neck length cannot hold most of the
 * buns and ponytails in the library without a hair piece at the tip;
 * anything past armpit length is what the "long hair" half of it was
 * photographed on.
 */
export function bandForLength(inches: number): LengthBand {
  if (inches < 8) return 'Short'
  if (inches < 16) return 'Medium'
  return 'Long'
}

/**
 * The user's current band, or undefined when they have never measured.
 *
 * Undefined is the honest answer rather than a guess: it means length
 * simply drops out of the ranking, which is better than quietly sorting
 * someone's library around an assumed head of hair.
 */
export function deriveLengthBand(checks: LengthCheck[]): LengthBand | undefined {
  const sorted = sortChecks(checks)
  const latest = sorted[sorted.length - 1]
  return latest ? bandForLength(latest.overall) : undefined
}

/**
 * Milestone targets, in inches of stretched length.
 *
 * Approximate by nature — where "shoulder length" falls depends on the
 * person's torso, not on a number. They are landmarks to aim at, and the
 * UI says so rather than presenting them as measurements.
 */
export const MILESTONES = [
  { label: 'Neck length', inches: 8 },
  { label: 'Shoulder length', inches: 12 },
  { label: 'Armpit length', inches: 16 },
  { label: 'Bra-strap length', inches: 20 },
  { label: 'Mid-back length', inches: 24 },
  { label: 'Waist length', inches: 30 },
] as const

export interface MilestoneStatus {
  label: string
  inches: number
  reached: boolean
  /** Absent when there is no data to project from. */
  etaISO?: string
  /** True when the estimate uses the population average, not the user's rate. */
  estimated?: boolean
}

export function projectMilestones(checks: LengthCheck[], now = Date.now()): MilestoneStatus[] {
  const stats = deriveStats(checks)
  const measured = stats.latest?.overall

  return MILESTONES.map((milestone) => {
    if (measured === undefined || stats.latest === undefined) {
      return { ...milestone, reached: false }
    }
    // "Reached" is a fact about what was measured, never about what has
    // been projected since — the app does not get to award a milestone
    // on hair nobody has put a tape to.
    if (measured >= milestone.inches) return { ...milestone, reached: true }

    // Project with the user's own rate where the record is long enough to
    // support one, otherwise the population average. A rate at or below
    // zero cannot reach anything, so no date is offered at all.
    const rate = stats.ownRateInPerMonth ?? AVG_GROWTH_IN_PER_MONTH
    if (rate <= 0) return { ...milestone, reached: false }

    /*
     * Project from today, not from the last check.
     *
     * Anchoring the estimate to `latest.dateISO` meant the clock stopped
     * when the user stopped logging: somebody who measured 10" last
     * January and never came back was shown "est. May 2025" a year and a
     * half after May 2025 had gone. The elapsed months since that check
     * have to be spent before the remaining ones are counted, which is
     * what carrying the length forward below does.
     *
     * The carried-forward figure is used for the estimate only. It is
     * not shown as a length and cannot mark a milestone reached.
     */
    const elapsedMonths = Math.max(
      0,
      (now - Date.parse(stats.latest.dateISO)) / 86_400_000 / DAYS_PER_MONTH,
    )
    const projectedNow = measured + rate * elapsedMonths
    const months = Math.max(0, (milestone.inches - projectedNow) / rate)

    const eta = new Date(now)
    eta.setDate(eta.getDate() + Math.round(months * DAYS_PER_MONTH))

    return {
      ...milestone,
      reached: false,
      etaISO: eta.toISOString(),
      estimated: stats.ownRateInPerMonth === undefined,
    }
  })
}

/** "Mar 2026" — the granularity length checks actually have. */
export function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export function newCheckId(): string {
  return `check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
