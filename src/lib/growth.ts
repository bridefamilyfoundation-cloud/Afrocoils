import type { LengthBand, LengthCheck, LengthUnit } from './types'

/**
 * Length-check maths.
 *
 * Kept as pure functions rather than living inside the Growth screen so
 * the retention rule — the one number here a user could reasonably
 * dispute — can be read and tested on its own.
 *
 * The model: length = start + growth × time − trims − breakage. A tape
 * cannot separate growth from breakage, so retention is the net rate
 * (trims added back) over the expected growth rate, and it is held back
 * until the record is long enough to be read past the tape's own error.
 */

export const CM_PER_IN = 2.54

/**
 * Expected scalp hair growth for afro-textured hair: about 0.3" a month.
 *
 * Loussouarn (Br J Dermatol, 2001) measured 38 adults of central and
 * west African heritage by phototrichogram at 256 ± 44 µm a day, against
 * 396 for Caucasian hair — which is where the "half an inch a month" the
 * rest of the category quotes comes from. 256 µm over 30.44 days is
 * 0.31". Individuals ran from 150 to 363 µm a day (about 0.2"–0.4" a
 * month), which is why retention is framed as a ratio against this
 * figure rather than as a verdict on anyone's follicles.
 */
export const AVG_GROWTH_IN_PER_MONTH = 0.3
const DAYS_PER_MONTH = 30.44

/**
 * How far one stretched tape measurement of coily hair is typically off:
 * about a quarter-inch. That is most of a month's growth, which is the
 * whole reason a trend is fitted through every check below rather than
 * subtracting the first from the last.
 */
const MEASUREMENT_SD_IN = 0.25
/**
 * The assumed error above counts as this many checks' worth of evidence
 * when the user's own scatter is read, so one lucky straight line cannot
 * claim a precision nobody's tape has.
 */
const PRIOR_WEIGHT = 2
/**
 * A trend is reported once its standard error is this small, in inches a
 * month. Monthly checks measured the same way reach it in about four
 * months; two checks alone need about five months between them.
 */
const SETTLED_SD_IN_PER_MONTH = 0.08

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

/**
 * The record, fitted.
 *
 * A least-squares line through every check, not just the first and last,
 * so a single badly-stretched measurement moves the answer a little
 * instead of all the way. Inches trimmed off are added back before the
 * fit — a trim is a choice, not breakage, and must not read as a loss of
 * retention.
 */
export interface GrowthTrend {
  /** Net inches a month kept on the head, trims added back. */
  netInPerMonth: number
  /** Standard error of that rate, in inches a month. */
  sdInPerMonth: number
  /** True once the rate is precise enough to report. */
  settled: boolean
  /** The line's value at the latest check, trims taken off again. */
  fittedLatest: number
}

export function fitTrend(checks: LengthCheck[]): GrowthTrend | undefined {
  const sorted = sortChecks(checks)
  if (sorted.length < 2) return undefined

  // A check's `trimmedInches` is what came off since the one before it,
  // so the first check's is ignored: there is no interval for it to fall in.
  let trimmed = 0
  const points = sorted.map((check, i) => {
    if (i > 0) trimmed += check.trimmedInches ?? 0
    return {
      t: daysBetween(sorted[0].dateISO, check.dateISO) / DAYS_PER_MONTH,
      y: check.overall + trimmed,
    }
  })

  const n = points.length
  const tMean = points.reduce((sum, p) => sum + p.t, 0) / n
  const yMean = points.reduce((sum, p) => sum + p.y, 0) / n
  let sxx = 0
  let sxy = 0
  for (const p of points) {
    sxx += (p.t - tMean) ** 2
    sxy += (p.t - tMean) * (p.y - yMean)
  }
  // Every check on the same day: there is no time axis to fit along.
  if (sxx === 0) return undefined

  const slope = sxy / sxx
  const intercept = yMean - slope * tMean
  const sse = points.reduce((sum, p) => sum + (p.y - (intercept + slope * p.t)) ** 2, 0)
  // The user's own scatter, pooled with the tape's typical error. Someone
  // who measures carefully earns a narrower range; someone whose checks
  // jump about gets a wider one, and the screen waits longer.
  const noise = (sse + PRIOR_WEIGHT * MEASUREMENT_SD_IN ** 2) / (n - 2 + PRIOR_WEIGHT)
  const sd = Math.sqrt(noise / sxx)

  return {
    netInPerMonth: slope,
    sdInPerMonth: sd,
    settled: sd <= SETTLED_SD_IN_PER_MONTH,
    fittedLatest: intercept + slope * points[n - 1].t - trimmed,
  }
}

export interface GrowthStats {
  latest?: LengthCheck
  previous?: LengthCheck
  /** Inches gained since the previous check, as measured, and the gap it happened over. */
  deltaInches?: number
  deltaDays?: number
  /** Inches logged as trimmed across the record. Never counted against retention. */
  trimmedInches: number
  trend?: GrowthTrend
  /**
   * Share of expected growth still on the head, from the fitted trend.
   * Undefined until the trend has settled.
   */
  retention?: number
  /** The 95% range around `retention`, from the trend's standard error. */
  retentionRange?: [number, number]
  totalDays?: number
}

export function deriveStats(checks: LengthCheck[]): GrowthStats {
  const sorted = sortChecks(checks)
  const trimmedInches = sorted
    .slice(1)
    .reduce((sum, check) => sum + (check.trimmedInches ?? 0), 0)
  if (sorted.length === 0) return { trimmedInches }

  const latest = sorted[sorted.length - 1]
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : undefined

  const stats: GrowthStats = { latest, previous, trimmedInches }

  if (previous) {
    stats.deltaInches = latest.overall - previous.overall
    stats.deltaDays = Math.round(daysBetween(previous.dateISO, latest.dateISO))
  }

  stats.totalDays = Math.round(daysBetween(sorted[0].dateISO, latest.dateISO))

  const trend = fitTrend(sorted)
  if (trend) {
    stats.trend = trend
    if (trend.settled) {
      const margin = 1.96 * trend.sdInPerMonth
      stats.retention = trend.netInPerMonth / AVG_GROWTH_IN_PER_MONTH
      stats.retentionRange = [
        (trend.netInPerMonth - margin) / AVG_GROWTH_IN_PER_MONTH,
        (trend.netInPerMonth + margin) / AVG_GROWTH_IN_PER_MONTH,
      ]
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

    // Project with the user's own trend once it has settled, otherwise
    // the population average with everything kept. A rate at or below
    // zero cannot reach anything, so no date is offered at all.
    const own = stats.trend?.settled ? stats.trend : undefined
    const rate = own?.netInPerMonth ?? AVG_GROWTH_IN_PER_MONTH
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
    // Start from the fitted line rather than the last reading where there
    // is one, so a single long or short measurement does not shift every
    // date on the list.
    const projectedNow = (own?.fittedLatest ?? measured) + rate * elapsedMonths
    const months = Math.max(0, (milestone.inches - projectedNow) / rate)

    const eta = new Date(now)
    eta.setDate(eta.getDate() + Math.round(months * DAYS_PER_MONTH))

    return {
      ...milestone,
      reached: false,
      etaISO: eta.toISOString(),
      estimated: own === undefined,
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
