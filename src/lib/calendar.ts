import type { CareEvent, CareEventType, CareSchedule } from './types'

/**
 * Care-calendar maths.
 *
 * Two rules run through this whole file.
 *
 * First, days are `YYYY-MM-DD` strings in the user's own timezone, never
 * timestamps and never `Date.parse` of a bare date string — `new
 * Date('2026-08-21')` is UTC midnight, which is the 20th for anyone west
 * of Greenwich, and a wash day landing on the wrong square is the sort
 * of bug nobody reports and everybody notices.
 *
 * Second, "next due" is always derived from the last event plus the
 * cadence, never stored. A stored due date goes stale the moment the
 * user does the thing early, late, or twice.
 */

export const MS_PER_DAY = 86_400_000

/* ------------------------------------------------------------------ *
 * Day keys
 * ------------------------------------------------------------------ */

/** Local-time `YYYY-MM-DD` for a Date. */
export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

/** A day key back to a Date at local midnight. */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number): string {
  const date = parseKey(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

/** Whole days from `a` to `b`. Negative when `b` is earlier. */
export function daysBetweenKeys(a: string, b: string): number {
  // Compare at local midday, so a DST shift inside the span cannot round
  // a whole-day difference down to 23 hours.
  const from = parseKey(a).setHours(12, 0, 0, 0)
  const to = parseKey(b).setHours(12, 0, 0, 0)
  return Math.round((to - from) / MS_PER_DAY)
}

/** "Today", "Yesterday", "in 3 days", "5 days ago". */
export function relativeDay(key: string, from = todayKey()): string {
  const delta = daysBetweenKeys(from, key)
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Yesterday'
  if (delta > 0) return `in ${delta} days`
  return `${-delta} days ago`
}

export function formatDayLong(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/* ------------------------------------------------------------------ *
 * Month grid
 * ------------------------------------------------------------------ */

export interface CalendarDay {
  key: string
  dayOfMonth: number
  /** False for the leading/trailing days borrowed from adjacent months. */
  inMonth: boolean
  isToday: boolean
  isFuture: boolean
  events: CareEvent[]
  /** Schedules that fall due on this day. */
  due: CareEventType[]
}

/**
 * Six weeks of days covering the given month.
 *
 * Always six rows rather than five-or-six, so the grid does not change
 * height as the user pages through months — a jumping layout makes the
 * next/previous buttons move out from under the thumb.
 */
export function buildMonth(
  year: number,
  month: number,
  events: CareEvent[],
  due: Map<string, CareEventType[]> = new Map(),
  weekStartsOn = 0,
): CalendarDay[][] {
  const byDay = groupByDay(events)
  const today = todayKey()

  const first = new Date(year, month, 1)
  const lead = (first.getDay() - weekStartsOn + 7) % 7
  const start = new Date(year, month, 1 - lead)

  const weeks: CalendarDay[][] = []
  const cursor = new Date(start)

  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = []
    for (let d = 0; d < 7; d++) {
      const key = dateKey(cursor)
      week.push({
        key,
        dayOfMonth: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
        isToday: key === today,
        isFuture: key > today,
        events: byDay.get(key) ?? [],
        due: due.get(key) ?? [],
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

export function groupByDay(events: CareEvent[]): Map<string, CareEvent[]> {
  const map = new Map<string, CareEvent[]>()
  for (const event of events) {
    const list = map.get(event.date)
    if (list) list.push(event)
    else map.set(event.date, [event])
  }
  return map
}

/** Weekday initials in the user's locale, starting on the given day. */
export function weekdayLabels(weekStartsOn = 0): string[] {
  // 2024-01-07 was a Sunday, so index 0 lines up with getDay() === 0.
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, 7 + ((i + weekStartsOn) % 7))
    return date.toLocaleDateString(undefined, { weekday: 'narrow' })
  })
}

/* ------------------------------------------------------------------ *
 * Scheduling
 * ------------------------------------------------------------------ */

export interface DueStatus {
  schedule: CareSchedule
  /** The last time this was actually done, if ever. */
  lastKey?: string
  /** When it is next due. Undefined until it has been done once. */
  dueKey?: string
  /** Positive when overdue, negative when still to come, 0 on the day. */
  overdueDays?: number
}

/**
 * Work out where each schedule stands.
 *
 * A schedule with no matching history has no due date at all rather than
 * defaulting to "due now". Telling somebody who just installed the app
 * that they are overdue for six different treatments is how an app gets
 * uninstalled; the first logged event starts the clock.
 */
export function deriveDue(
  schedules: CareSchedule[],
  events: CareEvent[],
  today = todayKey(),
): DueStatus[] {
  const lastByType = new Map<CareEventType, string>()
  for (const event of events) {
    const current = lastByType.get(event.type)
    if (!current || event.date > current) lastByType.set(event.type, event.date)
  }

  return schedules
    .filter((schedule) => schedule.enabled)
    .map((schedule) => {
      const lastKey = lastByType.get(schedule.type)
      if (!lastKey) return { schedule }

      const dueKey = addDays(lastKey, schedule.everyDays)
      return {
        schedule,
        lastKey,
        dueKey,
        overdueDays: daysBetweenKeys(dueKey, today),
      }
    })
}

/** Due statuses worth showing at the top: overdue first, then soonest. */
export function sortByUrgency(statuses: DueStatus[]): DueStatus[] {
  return [...statuses].sort((a, b) => {
    // Never-logged schedules sink to the bottom — there is nothing to say
    // about them beyond "log this once and I will start tracking it".
    if (a.overdueDays === undefined) return b.overdueDays === undefined ? 0 : 1
    if (b.overdueDays === undefined) return -1
    return b.overdueDays - a.overdueDays
  })
}

/**
 * Upcoming due dates, keyed by day, for painting the month grid.
 *
 * Projects each schedule forward repeatedly rather than only marking the
 * next one, so paging to next month still shows the rhythm. Capped so a
 * daily schedule cannot generate an unbounded map.
 */
export function projectDue(
  statuses: DueStatus[],
  fromKey: string,
  toKey: string,
  maxPerSchedule = 12,
): Map<string, CareEventType[]> {
  const map = new Map<string, CareEventType[]>()

  for (const status of statuses) {
    if (!status.dueKey || status.schedule.everyDays <= 0) continue

    let key = status.dueKey
    // Fast-forward to the window rather than stepping day by day from a
    // date that could be years back.
    if (key < fromKey) {
      const gap = daysBetweenKeys(key, fromKey)
      const skips = Math.ceil(gap / status.schedule.everyDays)
      key = addDays(key, skips * status.schedule.everyDays)
    }

    for (let i = 0; i < maxPerSchedule && key <= toKey; i++) {
      const list = map.get(key)
      if (list) list.push(status.schedule.type)
      else map.set(key, [status.schedule.type])
      key = addDays(key, status.schedule.everyDays)
    }
  }

  return map
}

/* ------------------------------------------------------------------ *
 * History summaries
 * ------------------------------------------------------------------ */

/**
 * Consecutive weeks containing at least one event of the given type.
 *
 * Weeks, not days: nobody washes their hair daily, so a day-grain streak
 * would read zero for everyone. Counting back from the current week and
 * stopping at the first gap means an in-progress week never breaks it.
 */
export function weeklyStreak(events: CareEvent[], type: CareEventType): number {
  const dates = events.filter((e) => e.type === type).map((e) => e.date)
  if (dates.length === 0) return 0

  const weeks = new Set(dates.map(weekKey))
  let streak = 0
  const cursor = new Date()

  // Allow the current week to be empty — it may simply not have happened
  // yet — but stop at the first fully elapsed week with nothing in it.
  if (!weeks.has(weekKey(dateKey(cursor)))) cursor.setDate(cursor.getDate() - 7)

  while (weeks.has(weekKey(dateKey(cursor)))) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

/** The Sunday of the week a day falls in, as its own day key. */
function weekKey(key: string): string {
  const date = parseKey(key)
  date.setDate(date.getDate() - date.getDay())
  return dateKey(date)
}

export function newEventId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Newest first — the order the timeline and `deriveDue` both expect. */
export function sortEvents(events: CareEvent[]): CareEvent[] {
  return [...events].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
