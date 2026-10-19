import { Link } from 'react-router-dom'
import Icon from './Icon'
import { daysBetweenKeys, deriveDue, relativeDay, sortByUrgency, todayKey } from '../lib/calendar'
import { useHairProfile } from '../lib/profile-store'

/**
 * What is currently happening to this hair, on the Growth screen.
 *
 * Growth used to be length checks and nothing else, which made it a
 * chart with no explanation attached — the numbers move because of what
 * you did between them, and that lived on a separate screen the user had
 * to go and find. So the three things that account for a change sit
 * above the chart: the style that is in right now, and what care is due.
 *
 * The calendar itself is still a screen of its own — a month grid does
 * not belong inside another screen — but it is now reached from here
 * rather than from the tab bar.
 */
export default function CareStatus() {
  const { profile } = useHairProfile()
  const { state, schedules, careEvents } = profile

  const today = todayKey()
  const due = sortByUrgency(deriveDue(schedules, careEvents)).filter(
    // Only things with a date. A schedule that has never been logged has
    // nothing to say here beyond "log it once", which is the calendar's
    // job to ask for, not this summary's.
    (status) => status.dueKey !== undefined,
  )
  const overdue = due.filter((status) => (status.overdueDays ?? 0) > 0)
  const upcoming = due.filter((status) => (status.overdueDays ?? 0) <= 0).slice(0, 2)
  const shown = [...overdue, ...upcoming].slice(0, 3)

  const installed = state.protectiveStyle
  const daysIn = installed
    ? daysBetweenKeys(installed.installedISO.slice(0, 10), today)
    : undefined

  const nothingToShow = shown.length === 0 && !installed

  return (
    <section className="mb-2xl">
      <div className="mb-md flex items-center justify-between gap-md">
        <h3 className="font-label-md text-label-md uppercase tracking-widest text-primary">
          Underway
        </h3>
        <Link
          to="/calendar"
          className="flex items-center gap-xs font-label-md text-caption text-primary active:scale-95"
        >
          <Icon name="calendar_month" className="text-[16px]" />
          Open the calendar
        </Link>
      </div>

      {nothingToShow ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container/50 p-lg text-center">
          <p className="mb-md font-body-md text-body-md text-on-surface-variant">
            Nothing logged yet. The calendar tracks wash days, treatments and retwists, and
            what it learns shows up here.
          </p>
          <Link
            to="/calendar"
            className="inline-block rounded-full bg-primary px-lg py-2 font-label-md text-label-md text-on-primary active:scale-95"
          >
            Set up your routine
          </Link>
        </div>
      ) : (
        <div className="space-y-sm">
          {installed && (
            <article className="flex items-center gap-md rounded-xl bg-secondary-fixed p-md text-on-secondary-fixed">
              <Icon name="checkroom" className="shrink-0 text-2xl" />
              <div className="min-w-0 flex-1">
                <p className="font-headline-md text-body-lg">{installed.name}</p>
                <p className="font-caption text-caption text-on-secondary-fixed-variant">
                  In for {daysIn ?? 0} day{daysIn === 1 ? '' : 's'}
                  {daysIn !== undefined &&
                    daysIn > 56 &&
                    ' — past the point most protective styles stop protecting'}
                </p>
              </div>
            </article>
          )}

          {shown.map((status) => {
            const late = (status.overdueDays ?? 0) > 0
            return (
              <Link
                key={status.schedule.type}
                to="/calendar"
                className={`flex items-center gap-md rounded-xl p-md transition-all active:scale-[0.98] ${
                  late
                    ? 'bg-primary-container text-on-primary-container'
                    : 'border border-outline-variant/30 bg-surface-container-lowest text-on-surface'
                }`}
              >
                <Icon
                  name={late ? 'warning' : 'schedule'}
                  className={`shrink-0 ${late ? '' : 'text-outline'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-label-md text-label-md">{status.schedule.type}</p>
                  <p className="font-caption text-caption opacity-80">
                    {late
                      ? `${status.overdueDays} day${status.overdueDays === 1 ? '' : 's'} overdue`
                      : `Due ${relativeDay(status.dueKey!)}`}
                  </p>
                </div>
                <Icon name="chevron_right" className="shrink-0 opacity-60" />
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
