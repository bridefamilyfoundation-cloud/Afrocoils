import { useState } from 'react'
import CareStatus from '../components/CareStatus'
import Icon from '../components/Icon'
import LengthChart from '../components/LengthChart'
import LogLengthCheck from '../components/LogLengthCheck'
import MyStyles from '../components/MyStyles'
import { PlusBadge, PlusCard } from '../components/Plus'
import ScreenFallback from '../components/ScreenFallback'
import {
  AVG_GROWTH_IN_PER_MONTH,
  deriveStats,
  formatLength,
  formatMonth,
  projectMilestones,
  sortChecks,
} from '../lib/growth'
import { isLocs, resolveLocStage } from '../lib/locs'
import { usePlus } from '../lib/plus'
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
  // The checks are always the user's to read. What Plus adds is the
  // analysis of them: retention, the trend, and milestone dates.
  const plus = usePlus()

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
    // Two checks is the first moment there is a trend to analyse, so it
    // is the one place the app suggests Plus unasked — once per launch.
    if (lengthChecks.length + 1 === 2) plus.offer('growth')
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

  // Starter and budding locs contract as they mature, so the length of a
  // loc can fall while the hair in it grows. A retention figure there
  // would report shrinkage as breakage; the checks still record.
  const locStage = isLocs(profile.identity) ? resolveLocStage(profile.identity).stage : undefined
  const locsContracting = locStage === 'Starter' || locStage === 'Budding'
  const retention = locsContracting ? undefined : stats.retention
  const pct = (ratio: number) => Math.round(Math.min(1, Math.max(0, ratio)) * 100)

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
            Measure stretched, from scalp to ends, on the same section each time. Check monthly:
            after about four months there is enough to see past the tape&rsquo;s own error and
            show whether you are keeping what you grow.
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
          hasPrevious={hasData}
          onSave={saveCheck}
          onCancel={() => setLogging(false)}
        />
      )}

      {hasData && (
        <>
          <section className="mb-2xl grid grid-cols-3 gap-md">
            <div className="rounded-xl shadow-card bg-surface-container-lowest p-md text-center">
              <Icon name="straighten" className="mb-xs text-primary" />
              <p className="font-headline-md text-headline-md text-on-surface">
                {formatLength(stats.latest!.overall, lengthUnit)}
              </p>
              <p className="font-caption text-caption text-on-surface-variant">Current length</p>
              <p className="font-caption text-caption text-outline">
                {formatMonth(stats.latest!.dateISO)}
              </p>
            </div>

            <div className="rounded-xl shadow-card bg-surface-container-lowest p-md text-center">
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
                {stats.deltaDays === undefined
                  ? 'first check'
                  : stats.latest!.trimmedInches
                    ? `${stats.deltaDays} days, ${formatLength(stats.latest!.trimmedInches, lengthUnit)} trimmed`
                    : `${stats.deltaDays} days`}
              </p>
            </div>

            {plus.unlocked ? (
              <div className="rounded-xl shadow-card bg-surface-container-lowest p-md text-center">
                <Icon name="shield" className="mb-xs text-primary" />
                <p className="font-headline-md text-headline-md text-on-surface">
                  {retention === undefined ? '—' : `${pct(retention)}%`}
                </p>
                <p className="font-caption text-caption text-on-surface-variant">Retention</p>
                <p className="font-caption text-caption text-outline">
                  {locsContracting
                    ? 'after budding'
                    : stats.retentionRange
                      ? `likely ${pct(stats.retentionRange[0])}–${pct(stats.retentionRange[1])}%`
                      : 'settling'}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => plus.open('growth')}
                className="flex flex-col items-center rounded-xl shadow-card bg-surface-container-lowest p-md text-center active:scale-[0.98]"
              >
                <Icon name="shield" className="mb-xs text-primary" />
                <PlusBadge className="my-xs" />
                <span className="font-caption text-caption text-on-surface-variant">Retention</span>
              </button>
            )}
          </section>

          <section className="mb-2xl rounded-2xl shadow-card bg-surface-container-lowest p-lg">
            <div className="mb-md flex items-center justify-between gap-md">
              <h3 className="font-headline-md text-body-lg font-bold text-on-surface">
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
                        ? 'bg-inverse-surface text-inverse-on-surface'
                        : 'bg-surface-container-lowest text-on-surface shadow-card'
                    }`}
                  >
                    {u === 'in' ? 'in' : 'cm'}
                  </button>
                ))}
              </div>
            </div>
            <LengthChart checks={lengthChecks} unit={lengthUnit} />
          </section>

          {/* How the retention figure was reached, or why there is none
              yet. Every sentence here is a claim about lib/growth.ts.
              The figure itself is Plus; why there isn't one yet is not. */}
          {!plus.unlocked && retention !== undefined ? (
            <div className="mb-2xl">
              <PlusCard
                trigger="growth"
                title="Your retention figure is ready"
                body={`Fitted through all ${lengthChecks.length} of your checks: how much of your growth you are keeping.`}
              />
            </div>
          ) : (
            <section className="mb-2xl rounded-2xl bg-secondary-fixed/30 p-lg">
              <p className="font-body-md text-body-md text-on-secondary-fixed-variant">
                {locsContracting ? (
                  <>
                    Starter and budding locs shrink as they mature, so a loc can be growing
                    steadily while measuring shorter. Retention starts once your locs reach the
                    teen stage; until then, keep measuring &mdash; these checks become the record
                    it is worked out from.
                  </>
                ) : retention !== undefined ? (
                  <>
                    Across {stats.totalDays} days your trend is{' '}
                    <span className="text-on-secondary-fixed">
                      {stats.trend!.netInPerMonth >= 0 ? '+' : ''}
                      {formatLength(stats.trend!.netInPerMonth, lengthUnit, 2)} a month
                    </span>
                    {stats.trimmedInches > 0 &&
                      `, with the ${formatLength(stats.trimmedInches, lengthUnit)} you trimmed added back`}
                    . Afro-textured hair grows about {AVG_GROWTH_IN_PER_MONTH}&Prime; a month
                    (0.2&ndash;0.4&Prime; from person to person), so retention compares what you
                    kept with that. The range narrows with every check measured the same way.
                  </>
                ) : (
                  <>
                    A tape on coily hair is only good to about a quarter-inch, which is most of a
                    month&rsquo;s growth. So retention waits until your checks span enough time to
                    see past it &mdash; about four months of monthly checks, sooner if your
                    measurements are consistent. The trend is fitted through every check, so none
                    of them is wasted.
                  </>
                )}
              </p>
            </section>
          )}

          <section className="mb-2xl">
            <h3 className="mb-xs font-headline-md text-body-lg font-bold text-on-surface">
              Milestones
            </h3>
            <p className="mb-md font-caption text-caption text-on-surface-variant">
              Landmarks are approximate — where &ldquo;shoulder length&rdquo; falls depends on
              your torso, not on a number.
              {nextMilestone?.estimated &&
                ` Dates assume the ${AVG_GROWTH_IN_PER_MONTH}" a month average, all of it kept, until your own trend settles.`}
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
                    {milestone.reached ? (
                      'reached'
                    ) : !milestone.etaISO ? (
                      '—'
                    ) : plus.unlocked ? (
                      `est. ${formatMonth(milestone.etaISO)}`
                    ) : (
                      <button
                        type="button"
                        onClick={() => plus.open('growth')}
                        aria-label={`Estimated date for ${milestone.label}: part of Plus`}
                      >
                        <PlusBadge />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* The table view for the chart above: every value readable
              without touching the chart. */}
          <section className="mb-2xl">
            <h3 className="mb-md font-headline-md text-body-lg font-bold text-on-surface">
              Check-in History
            </h3>
            <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded-xl shadow-card bg-surface-container-lowest">
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
                  {entry.trimmedInches !== undefined && (
                    <p className="font-caption text-caption text-on-surface-variant">
                      Trimmed {formatLength(entry.trimmedInches, lengthUnit)} since the check before
                    </p>
                  )}
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
