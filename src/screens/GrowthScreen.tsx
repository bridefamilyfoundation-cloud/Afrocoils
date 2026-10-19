import { useState } from 'react'
import CareStatus from '../components/CareStatus'
import Icon from '../components/Icon'
import LengthChart from '../components/LengthChart'
import LogLengthCheck from '../components/LogLengthCheck'
import MyStyles from '../components/MyStyles'
import ScreenFallback from '../components/ScreenFallback'
import {
  AVG_GROWTH_IN_PER_MONTH,
  deriveStats,
  formatLength,
  formatMonth,
  projectMilestones,
  sortChecks,
} from '../lib/growth'
import { useHairProfile } from '../lib/profile-store'
import { useBackDismiss } from '../lib/back-button'
import type { LengthCheck, LengthUnit } from '../lib/types'
import { LENGTH_UNITS } from '../lib/types'

/**
 * Growth, backed by the profile's `lengthChecks`.
 *
 * Retention rather than growth is the headline, because growth rate is
 * near-constant and mostly outside anyone's control — what a routine
 * actually changes is how much of it survives to be measured.
 *
 * Which is why the chart is no longer the whole screen. What is underway
 * (the style that is in, the care that is due, the last SOS plan) sits
 * above it, and the styles the user has actually worn sit below it —
 * the causes on one side of the numbers and the record on the other.
 * The calendar keeps its own screen and is reached from here.
 *
 */

export default function GrowthScreen() {
  const { profile, update, ready } = useHairProfile()
  const [logging, setLogging] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Back cancels what is open over the page before it leaves the screen.
  // A delete confirmation that the back button walks straight past is the
  // one place that gesture must not be a no-op.
  useBackDismiss(confirmDelete !== null, () => setConfirmDelete(null))
  useBackDismiss(logging, () => setLogging(false))

  const { lengthChecks, lengthUnit } = profile
  const stats = deriveStats(lengthChecks)
  const milestones = projectMilestones(lengthChecks)
  const history = sortChecks(lengthChecks).reverse()

  function saveCheck(check: LengthCheck) {
    update({ lengthChecks: [...lengthChecks, check] })
    setLogging(false)
  }

  function deleteCheck(id: string) {
    update({ lengthChecks: lengthChecks.filter((c) => c.id !== id) })
    setConfirmDelete(null)
  }

  function setUnit(unit: LengthUnit) {
    // Only the display preference changes — stored lengths are canonical
    // inches, so history needs no rewriting and cannot drift.
    update({ lengthUnit: unit })
  }

  if (!ready) return <ScreenFallback />

  const hasData = lengthChecks.length > 0
  const nextMilestone = milestones.find((m) => !m.reached)

  return (
    <>
      <section data-tour="growth-heading" className="mb-xl text-center">
        <h2 className="mb-sm font-headline-lg text-headline-lg-mobile text-on-background">
          Hair Growth
        </h2>
        <p className="mx-auto max-w-md font-body-md text-body-md text-on-surface-variant">
          What is in your hair, what is due, and what you are actually keeping. Retention
          matters more than growth &mdash; hair grows steadily, the difference is how much
          survives.
        </p>
      </section>

      <CareStatus />

      {!hasData && !logging && (
        <section className="mb-2xl rounded-2xl border border-dashed border-outline-variant bg-surface-container/50 p-xl text-center">
          <Icon name="straighten" className="mb-sm text-3xl text-outline" />
          <h3 className="mb-sm font-headline-md text-headline-md text-on-surface">
            No length checks yet
          </h3>
          <p className="mx-auto mb-lg max-w-sm font-body-md text-body-md text-on-surface-variant">
            Measure stretched, from scalp to ends. Two checks eight weeks apart is enough to
            see whether you are retaining what you grow.
          </p>
          <button
            type="button"
            onClick={() => setLogging(true)}
            className="inline-flex items-center gap-sm rounded-full bg-primary px-xl py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
          >
            <Icon name="add" className="text-[18px]" />
            Log your first check
          </button>
        </section>
      )}

      {logging && (
        <LogLengthCheck
          unit={lengthUnit}
          onSave={saveCheck}
          onCancel={() => setLogging(false)}
        />
      )}

      {hasData && (
        <>
          <section className="mb-2xl grid grid-cols-3 gap-md">
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md text-center">
              <Icon name="straighten" className="mb-xs text-primary" />
              <p className="font-headline-md text-headline-md text-on-surface">
                {formatLength(stats.latest!.overall, lengthUnit)}
              </p>
              <p className="font-caption text-caption text-on-surface-variant">Current length</p>
              <p className="font-caption text-caption text-outline">
                {formatMonth(stats.latest!.dateISO)}
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md text-center">
              <Icon name="trending_up" className="mb-xs text-primary" />
              <p className="font-headline-md text-headline-md text-on-surface">
                {stats.deltaInches === undefined
                  ? '—'
                  : `${stats.deltaInches >= 0 ? '+' : ''}${formatLength(stats.deltaInches, lengthUnit)}`}
              </p>
              <p className="font-caption text-caption text-on-surface-variant">
                Since last check
              </p>
              <p className="font-caption text-caption text-outline">
                {stats.deltaDays === undefined ? 'first check' : `${stats.deltaDays} days`}
              </p>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md text-center">
              <Icon name="shield" className="mb-xs text-primary" />
              <p className="font-headline-md text-headline-md text-on-surface">
                {stats.retention === undefined
                  ? '—'
                  : `${Math.round(Math.max(0, stats.retention) * 100)}%`}
              </p>
              <p className="font-caption text-caption text-on-surface-variant">Retention</p>
              <p className="font-caption text-caption text-outline">
                {stats.retention === undefined ? 'needs 4+ weeks' : 'of expected growth'}
              </p>
            </div>
          </section>

          <section className="mb-2xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-lg">
            <div className="mb-md flex items-center justify-between gap-md">
              <h3 className="font-label-md text-label-md uppercase tracking-widest text-primary">
                Length over time
              </h3>
              <div className="flex gap-xs" role="group" aria-label="Length unit">
                {LENGTH_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={lengthUnit === u}
                    onClick={() => setUnit(u)}
                    className={`rounded-full px-md py-1 font-label-md text-caption transition-colors active:scale-95 ${
                      lengthUnit === u
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {u === 'in' ? 'in' : 'cm'}
                  </button>
                ))}
              </div>
            </div>
            <LengthChart checks={lengthChecks} unit={lengthUnit} />
          </section>

          {stats.retention !== undefined && (
            <section className="mb-2xl rounded-2xl bg-secondary-fixed/30 p-lg">
              <p className="font-body-md text-body-md text-on-secondary-fixed-variant">
                Over {stats.totalDays} days you gained{' '}
                <span className="text-on-secondary-fixed">
                  {formatLength(stats.latest!.overall - sortChecks(lengthChecks)[0].overall, lengthUnit)}
                </span>
                . Scalp hair grows about {AVG_GROWTH_IN_PER_MONTH}&Prime; a month regardless of
                routine, so retention compares what you kept against what you grew.
                {stats.ownRateInPerMonth !== undefined && (
                  <>
                    {' '}
                    Your own measured rate is{' '}
                    {formatLength(stats.ownRateInPerMonth, lengthUnit, 2)} a month.
                  </>
                )}
              </p>
            </section>
          )}

          <section className="mb-2xl">
            <h3 className="mb-xs font-label-md text-label-md uppercase tracking-widest text-primary">
              Milestones
            </h3>
            <p className="mb-md font-caption text-caption text-on-surface-variant">
              Landmarks are approximate — where &ldquo;shoulder length&rdquo; falls depends on
              your torso, not on a number.
              {nextMilestone?.estimated &&
                ' Dates use the 0.5" a month average until you have two checks two months apart.'}
            </p>
            <ul className="space-y-sm">
              {milestones.map((milestone) => (
                <li
                  key={milestone.label}
                  className={`flex items-center gap-md rounded-xl p-md ${
                    milestone.reached ? 'bg-tertiary-fixed' : 'bg-surface-container'
                  }`}
                >
                  <Icon
                    name={milestone.reached ? 'check_circle' : 'radio_button_unchecked'}
                    filled={milestone.reached}
                    className={milestone.reached ? 'text-tertiary' : 'text-on-surface-variant'}
                  />
                  <span
                    className={`flex-1 font-body-md text-body-md ${
                      milestone.reached ? 'text-on-tertiary-fixed' : 'text-on-surface'
                    }`}
                  >
                    {milestone.label}
                    <span className="ml-xs font-caption text-caption text-on-surface-variant">
                      {formatLength(milestone.inches, lengthUnit, 0)}
                    </span>
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant">
                    {milestone.reached
                      ? 'reached'
                      : milestone.etaISO
                        ? `est. ${formatMonth(milestone.etaISO)}`
                        : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* The table view for the chart above: every value readable
              without touching the chart. */}
          <section className="mb-2xl">
            <h3 className="mb-md font-label-md text-label-md uppercase tracking-widest text-primary">
              Check-in History
            </h3>
            <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
              {history.map((entry) => (
                <li key={entry.id} className="p-md">
                  <div className="mb-xs flex items-baseline justify-between gap-md">
                    <span className="font-label-md text-label-md text-on-surface">
                      {new Date(entry.dateISO).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="font-headline-md text-body-lg tabular-nums text-primary">
                      {formatLength(entry.overall, lengthUnit)}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="font-body-md text-caption text-on-surface-variant">
                      {entry.note}
                    </p>
                  )}
                  {entry.sections && (
                    <p className="mt-xs font-caption text-caption text-outline">
                      {Object.entries(entry.sections)
                        .map(([k, v]) => `${k} ${formatLength(v, lengthUnit)}`)
                        .join(' · ')}
                    </p>
                  )}
                  {confirmDelete === entry.id ? (
                    <div className="mt-sm flex items-center gap-sm">
                      <span className="flex-1 font-caption text-caption text-error">
                        Delete this check?
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteCheck(entry.id)}
                        className="rounded-full bg-error px-md py-1 font-label-md text-caption text-on-error active:scale-95"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-full border border-outline px-md py-1 font-label-md text-caption text-on-surface-variant active:scale-95"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(entry.id)}
                      aria-label={`Delete check from ${formatMonth(entry.dateISO)}`}
                      className="mt-xs flex items-center gap-xs font-caption text-caption text-outline active:scale-95"
                    >
                      <Icon name="delete" className="text-[14px]" />
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {hasData && !logging && (
        <button
          type="button"
          onClick={() => setLogging(true)}
          className="mb-2xl flex w-full items-center justify-center gap-sm rounded-full bg-primary py-4 font-label-md text-label-md text-on-primary transition-all active:scale-95"
        >
          <Icon name="add" className="text-[18px]" />
          Log a length check
        </button>
      )}

      {/* The styles the user has actually worn, with their own photos.
          This was on the profile screen, where it sat among questions
          about the hair rather than among the record of what has been
          done to it. */}
      <MyStyles />
    </>
  )
}
