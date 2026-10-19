import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionCrumb from '../components/SectionCrumb'
import Icon, { type IconName } from '../components/Icon'
import ScreenFallback from '../components/ScreenFallback'
import { useHairProfile } from '../lib/profile-store'
import { useBackDismiss } from '../lib/back-button'
import {
  addDays,
  buildMonth,
  daysBetweenKeys,
  deriveDue,
  formatDayLong,
  newEventId,
  projectDue,
  relativeDay,
  sortByUrgency,
  sortEvents,
  todayKey,
  weekdayLabels,
  weeklyStreak,
  type CalendarDay,
  type DueStatus,
} from '../lib/calendar'
import {
  checkPermission,
  notificationsAvailable,
  requestPermission,
  syncReminders,
  type PermissionState,
} from '../lib/notifications'
import { isLocs } from '../lib/locs'
import type { CareEvent, CareEventType, CareSchedule } from '../lib/types'
import { CARE_EVENT_TYPES, LOC_ONLY_EVENTS, LOOSE_ONLY_EVENTS } from '../lib/types'

/**
 * The care calendar.
 *
 * Three things stacked in priority order: what is due, what month it is,
 * and what the user has actually done. The due list comes first because
 * it is the only part that answers a question the user did not already
 * know the answer to.
 *
 * Everything here reads and writes `profile.careEvents` and
 * `profile.schedules`. There is no screen-local copy of either — the
 * growth chart and the SOS prompt both read the same history, and a
 * second copy would drift the moment the user logged something.
 */

const EVENT_ICONS: Record<CareEventType, IconName> = {
  'Wash day': 'water_drop',
  'Deep condition': 'spa',
  'Protein treatment': 'science',
  Clarify: 'auto_awesome',
  'Scalp treatment': 'spa',
  Retwist: 'grass',
  Trim: 'content_cut',
  'Style installed': 'checkroom',
  'Style taken down': 'checkroom',
  'Length check': 'straighten',
  Other: 'check',
}

const MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }

export default function CalendarScreen() {
  const { profile, update, ready } = useHairProfile()
  const locs = isLocs(profile.identity)

  const today = todayKey()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState<string>(today)
  const [logging, setLogging] = useState(false)

  // Back closes the log sheet rather than leaving the calendar under it.
  useBackDismiss(logging, () => setLogging(false))
  const [showSchedules, setShowSchedules] = useState(false)
  const [permission, setPermission] = useState<PermissionState>('unavailable')

  useEffect(() => {
    void checkPermission().then(setPermission)
  }, [])

  const events = useMemo(() => sortEvents(profile.careEvents), [profile.careEvents])

  const due = useMemo(
    () => sortByUrgency(deriveDue(profile.schedules, events, today)),
    [profile.schedules, events, today],
  )

  const weeks = useMemo(() => {
    const first = `${cursor.year}-${`${cursor.month + 1}`.padStart(2, '0')}-01`
    // The grid borrows up to six days either side of the month, so project
    // due dates across a slightly wider window than the month itself.
    const projected = projectDue(due, addDays(first, -7), addDays(first, 44))
    return buildMonth(cursor.year, cursor.month, events, projected)
  }, [cursor, events, due])

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    undefined,
    MONTH_FORMAT,
  )

  const selectedDay = weeks.flat().find((d) => d.key === selected)
  const washStreak = weeklyStreak(events, 'Wash day')

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const date = new Date(year, month + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  function logEvent(type: CareEventType, date: string, note?: string) {
    const event: CareEvent = {
      id: newEventId(),
      type,
      date,
      note: note?.trim() || undefined,
      createdISO: new Date().toISOString(),
    }
    update({ careEvents: [event, ...profile.careEvents] })
    setLogging(false)
  }

  function removeEvent(id: string) {
    update({ careEvents: profile.careEvents.filter((e) => e.id !== id) })
  }

  function patchSchedule(type: CareEventType, patch: Partial<CareSchedule>) {
    update({
      schedules: profile.schedules.map((s) => (s.type === type ? { ...s, ...patch } : s)),
    })
  }

  /**
   * Turning a reminder on is the moment to ask for permission — not app
   * launch, when the user has no idea what would be notified and a denial
   * is close to permanent on Android.
   */
  async function toggleReminder(schedule: CareSchedule) {
    if (!schedule.reminder) {
      const state = permission === 'granted' ? permission : await requestPermission()
      setPermission(state)
      if (state !== 'granted') return
    }
    const next = profile.schedules.map((s) =>
      s.type === schedule.type ? { ...s, reminder: !s.reminder } : s,
    )
    update({ schedules: next })
    void syncReminders(deriveDue(next, events, today))
  }

  if (!ready) return <ScreenFallback />

  const availableTypes = CARE_EVENT_TYPES.filter((type) => {
    if (locs) return !LOOSE_ONLY_EVENTS.includes(type)
    return !LOC_ONLY_EVENTS.includes(type)
  })

  return (
    <>
      <section className="mb-xl text-center">
        <SectionCrumb to="/care" label="Hair Care" />
        <h2 className="mb-sm font-headline-lg text-headline-lg-mobile text-on-background">
          Hair Calendar
        </h2>
        <p className="mx-auto max-w-md font-body-md text-body-md text-on-surface-variant">
          What you did, and what is coming up. Nothing here is due until you have logged it
          once — the app learns your rhythm rather than imposing one.
        </p>
      </section>

      {/* What is due. First because it is the only part the user cannot
          already see by looking at their own hair. */}
      <section className="mb-2xl">
        <div className="mb-md flex items-center justify-between">
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-primary">
            Coming up
          </h3>
          <button
            type="button"
            onClick={() => setShowSchedules((v) => !v)}
            className="flex items-center gap-xs font-label-md text-caption text-primary active:scale-95"
          >
            <Icon name="edit" className="text-[16px]" />
            {showSchedules ? 'Done' : 'Adjust'}
          </button>
        </div>

        {due.length === 0 ? (
          <EmptyCard
            icon="calendar_month"
            title="No schedule yet"
            body={
              profile.identity.hairType
                ? 'Log something below and the app will start tracking when it is next due.'
                : 'Tell us whether you have loose hair or locs and the calendar sets itself up around it.'
            }
            action={
              profile.identity.hairType
                ? undefined
                : { to: '/profile', label: 'Set your hair type' }
            }
          />
        ) : (
          <ul className="space-y-sm">
            {due.slice(0, showSchedules ? due.length : 4).map((status) => (
              <DueRow
                key={status.schedule.type}
                status={status}
                editing={showSchedules}
                permission={permission}
                onLog={() => logEvent(status.schedule.type, today)}
                onPatch={(patch) => patchSchedule(status.schedule.type, patch)}
                onToggleReminder={() => void toggleReminder(status.schedule)}
              />
            ))}
          </ul>
        )}

        {showSchedules && notificationsAvailable() && permission === 'denied' && (
          <p className="mt-md flex items-start gap-sm rounded-xl bg-error-container p-md font-caption text-caption text-on-error-container">
            <Icon name="notifications" className="shrink-0 text-[16px]" />
            Notifications are blocked for this app. Turn them back on in your device settings
            to use reminders.
          </p>
        )}
      </section>

      {/* Month grid */}
      <section className="mb-2xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-md">
        <div className="mb-md flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant active:scale-90"
          >
            <Icon name="chevron_left" />
          </button>
          <h3 className="font-headline-md text-body-lg text-on-surface">{monthLabel}</h3>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant active:scale-90"
          >
            <Icon name="chevron_right" />
          </button>
        </div>

        <div className="mb-xs grid grid-cols-7 gap-xs">
          {weekdayLabels().map((label, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="text-center font-caption text-caption text-outline"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-xs">
          {weeks.flat().map((day) => (
            <DayCell
              key={day.key}
              day={day}
              selected={day.key === selected}
              onSelect={() => setSelected(day.key)}
            />
          ))}
        </div>

        <Legend />
      </section>

      {/* The selected day */}
      <section className="mb-2xl">
        <div className="mb-md flex items-baseline justify-between">
          <h3 className="font-headline-md text-body-lg text-on-surface">
            {selected === today ? 'Today' : formatDayLong(selected)}
          </h3>
          <span className="font-caption text-caption text-on-surface-variant">
            {relativeDay(selected)}
          </span>
        </div>

        {selectedDay && selectedDay.due.length > 0 && (
          <ul className="mb-md space-y-xs">
            {selectedDay.due.map((type) => (
              <li
                key={type}
                className="flex items-center gap-sm rounded-xl border border-dashed border-primary/40 bg-primary-fixed/30 p-md"
              >
                <Icon name={EVENT_ICONS[type]} className="text-primary" />
                <span className="flex-1 font-body-md text-body-md text-on-surface">
                  {type} due
                </span>
                <button
                  type="button"
                  onClick={() => logEvent(type, selected)}
                  className="rounded-full bg-primary px-md py-1 font-label-md text-caption text-on-primary active:scale-95"
                >
                  Log it
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedDay && selectedDay.events.length > 0 ? (
          <ul className="mb-md divide-y divide-outline-variant/30 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
            {selectedDay.events.map((event) => (
              <li key={event.id} className="flex items-center gap-md p-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                  <Icon name={EVENT_ICONS[event.type]} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-body-md text-body-md text-on-surface">{event.type}</p>
                  {event.note && (
                    <p className="font-caption text-caption text-on-surface-variant">
                      {event.note}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeEvent(event.id)}
                  aria-label={`Delete ${event.type}`}
                  className="shrink-0 p-1 text-outline active:scale-90"
                >
                  <Icon name="delete" className="text-[18px]" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          selectedDay?.due.length === 0 && (
            <p className="mb-md rounded-xl border border-dashed border-outline-variant bg-surface-container/50 p-lg text-center font-body-md text-body-md text-on-surface-variant">
              Nothing logged {selected === today ? 'today' : 'that day'}.
            </p>
          )
        )}

        {logging ? (
          <LogForm
            date={selected}
            types={availableTypes}
            onCancel={() => setLogging(false)}
            onSave={logEvent}
          />
        ) : (
          <button
            type="button"
            onClick={() => setLogging(true)}
            className="flex w-full items-center justify-center gap-sm rounded-full bg-primary py-3 font-label-md text-label-md text-on-primary active:scale-95"
          >
            <Icon name="add" className="text-[18px]" />
            Log something
          </button>
        )}
      </section>

      {/* History summary */}
      {events.length > 0 && (
        <section className="mb-2xl grid grid-cols-2 gap-md sm:grid-cols-3">
          <Stat label="Logged" value={`${events.length}`} hint="entries" />
          <Stat
            label="Wash streak"
            value={`${washStreak}`}
            hint={washStreak === 1 ? 'week' : 'weeks'}
          />
          <Stat
            label="Last wash"
            value={
              events.find((e) => e.type === 'Wash day')
                ? `${daysBetweenKeys(events.find((e) => e.type === 'Wash day')!.date, today)}`
                : '—'
            }
            hint="days ago"
          />
        </section>
      )}

      <section className="rounded-2xl bg-secondary-container p-lg">
        <div className="mb-sm flex items-center gap-sm">
          <Icon name="show_chart" className="text-on-secondary-container" />
          <h3 className="font-headline-md text-headline-md text-on-secondary-container">
            Seeing the payoff
          </h3>
        </div>
        <p className="mb-md font-body-md text-body-md text-on-secondary-container/90">
          A calendar tells you what you did. The growth tracker tells you whether it worked.
        </p>
        <Link
          to="/growth"
          className="inline-block rounded-full bg-on-secondary-container px-lg py-2 font-label-md text-label-md text-secondary-container active:scale-95"
        >
          Open growth tracker
        </Link>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function DayCell({
  day,
  selected,
  onSelect,
}: {
  day: CalendarDay
  selected: boolean
  onSelect: () => void
}) {
  const hasEvents = day.events.length > 0
  const hasDue = day.due.length > 0

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${formatDayLong(day.key)}${hasEvents ? `, ${day.events.length} logged` : ''}${
        hasDue ? ', due' : ''
      }`}
      className={[
        'relative flex aspect-square flex-col items-center justify-center rounded-lg font-body-md text-caption transition-colors active:scale-95',
        selected ? 'bg-primary text-on-primary' : '',
        !selected && day.isToday ? 'bg-secondary-container text-on-secondary-container' : '',
        !selected && !day.isToday && day.inMonth ? 'text-on-surface' : '',
        // Adjacent-month days stay tappable — tapping one is how you page
        // to a day at the edge — but recede so the month still reads.
        !day.inMonth ? 'text-outline/50' : '',
      ].join(' ')}
    >
      {day.dayOfMonth}
      <span className="mt-0.5 flex h-1 gap-0.5">
        {hasEvents && (
          <span
            className={`h-1 w-1 rounded-full ${selected ? 'bg-on-primary' : 'bg-primary'}`}
          />
        )}
        {hasDue && (
          <span
            className={`h-1 w-1 rounded-full ring-1 ${
              selected ? 'ring-on-primary' : 'ring-primary'
            }`}
          />
        )}
      </span>
    </button>
  )
}

function Legend() {
  return (
    <div className="mt-md flex justify-center gap-lg font-caption text-caption text-on-surface-variant">
      <span className="flex items-center gap-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Logged
      </span>
      <span className="flex items-center gap-xs">
        <span className="h-1.5 w-1.5 rounded-full ring-1 ring-primary" />
        Due
      </span>
    </div>
  )
}

function DueRow({
  status,
  editing,
  permission,
  onLog,
  onPatch,
  onToggleReminder,
}: {
  status: DueStatus
  editing: boolean
  permission: PermissionState
  onLog: () => void
  onPatch: (patch: Partial<CareSchedule>) => void
  onToggleReminder: () => void
}) {
  const { schedule, dueKey, overdueDays } = status
  const overdue = overdueDays !== undefined && overdueDays > 0
  const dueToday = overdueDays === 0

  return (
    <li
      className={`rounded-xl border p-md ${
        overdue
          ? 'border-error/30 bg-error-container/40'
          : 'border-outline-variant/30 bg-surface-container-lowest'
      }`}
    >
      <div className="flex items-center gap-md">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            overdue
              ? 'bg-error text-on-error'
              : dueToday
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <Icon name={EVENT_ICONS[schedule.type]} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-body-md text-body-md text-on-surface">{schedule.type}</p>
          <p className="font-caption text-caption text-on-surface-variant">
            {!dueKey
              ? 'Log it once to start tracking'
              : overdue
                ? `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`
                : dueToday
                  ? 'Due today'
                  : `Due ${relativeDay(dueKey)}`}
            {' · every '}
            {schedule.everyDays} days
          </p>
        </div>

        <button
          type="button"
          onClick={onLog}
          className="shrink-0 rounded-full border border-primary px-md py-1 font-label-md text-caption text-primary active:scale-95"
        >
          Done
        </button>
      </div>

      {editing && (
        <div className="mt-md flex flex-wrap items-center gap-md border-t border-outline-variant/30 pt-md">
          <label className="flex items-center gap-sm font-caption text-caption text-on-surface-variant">
            Every
            <input
              type="number"
              min={1}
              max={365}
              value={schedule.everyDays}
              onChange={(e) =>
                onPatch({ everyDays: Math.min(365, Math.max(1, Number(e.target.value) || 1)) })
              }
              className="w-16 rounded-lg border-outline-variant bg-surface-container-low py-1 font-body-md text-caption text-on-surface"
            />
            days
          </label>

          <button
            type="button"
            aria-pressed={schedule.enabled}
            onClick={() => onPatch({ enabled: !schedule.enabled })}
            className={`rounded-full px-md py-1 font-label-md text-caption active:scale-95 ${
              schedule.enabled
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {schedule.enabled ? 'Tracking' : 'Off'}
          </button>

          {notificationsAvailable() && permission !== 'denied' && (
            <button
              type="button"
              aria-pressed={schedule.reminder}
              onClick={onToggleReminder}
              className={`flex items-center gap-xs rounded-full px-md py-1 font-label-md text-caption active:scale-95 ${
                schedule.reminder
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <Icon name="notifications" filled={schedule.reminder} className="text-[14px]" />
              {schedule.reminder ? `Remind at ${schedule.reminderTime}` : 'Remind me'}
            </button>
          )}

          {schedule.reminder && (
            <input
              type="time"
              value={schedule.reminderTime}
              onChange={(e) => onPatch({ reminderTime: e.target.value })}
              aria-label={`Reminder time for ${schedule.type}`}
              className="rounded-lg border-outline-variant bg-surface-container-low py-1 font-body-md text-caption text-on-surface"
            />
          )}
        </div>
      )}
    </li>
  )
}

function LogForm({
  date,
  types,
  onCancel,
  onSave,
}: {
  date: string
  types: readonly CareEventType[]
  onCancel: () => void
  onSave: (type: CareEventType, date: string, note?: string) => void
}) {
  const [type, setType] = useState<CareEventType>(types[0])
  const [note, setNote] = useState('')
  const [when, setWhen] = useState(date)

  // Reopening the form on a different day should default to that day.
  useEffect(() => setWhen(date), [date])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(type, when, note)
      }}
      className="rounded-2xl border border-outline-variant/30 bg-surface-container p-lg"
    >
      <h4 className="mb-md font-headline-md text-body-lg text-on-surface">Log an entry</h4>

      <div className="mb-md flex flex-wrap gap-sm">
        {types.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={type === option}
            onClick={() => setType(option)}
            className={`rounded-full px-md py-1.5 font-label-md text-caption transition-colors active:scale-95 ${
              type === option
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2">
        <label className="flex flex-col gap-xs">
          <span className="font-label-md text-caption text-on-surface-variant">Date</span>
          <input
            type="date"
            value={when}
            max={todayKey()}
            onChange={(e) => setWhen(e.target.value || when)}
            className="rounded-lg border-outline-variant bg-surface-container-low font-body-md text-body-md text-on-surface"
          />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="font-label-md text-caption text-on-surface-variant">
            Note (optional)
          </span>
          <input
            type="text"
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What you used, how it went"
            className="rounded-lg border-outline-variant bg-surface-container-low font-body-md text-body-md text-on-surface placeholder:text-outline"
          />
        </label>
      </div>

      <div className="flex gap-sm">
        <button
          type="submit"
          className="flex-1 rounded-full bg-primary py-3 font-label-md text-label-md text-on-primary active:scale-95"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-outline-variant px-lg py-3 font-label-md text-label-md text-on-surface-variant active:scale-95"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-surface-container p-md text-center">
      <p className="font-headline-lg text-headline-md text-primary">{value}</p>
      <p className="font-caption text-caption text-on-surface-variant">{hint}</p>
      <p className="mt-xs font-label-md text-caption uppercase tracking-widest text-outline">
        {label}
      </p>
    </div>
  )
}

function EmptyCard({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName
  title: string
  body: string
  action?: { to: string; label: string }
}) {
  return (
    <div className="rounded-2xl bg-secondary-container p-lg">
      <div className="mb-sm flex items-center gap-sm">
        <Icon name={icon} className="text-on-secondary-container" />
        <h3 className="font-headline-md text-headline-md text-on-secondary-container">
          {title}
        </h3>
      </div>
      <p className="font-body-md text-body-md text-on-secondary-container/90">{body}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-md inline-block rounded-full bg-on-secondary-container px-lg py-2 font-label-md text-label-md text-secondary-container active:scale-95"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
