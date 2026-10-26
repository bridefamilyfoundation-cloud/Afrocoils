import { useState } from 'react'
import { todayKey } from '../lib/calendar'
import { fromDisplay, newCheckId } from '../lib/growth'
import type { LengthCheck, LengthUnit, Section } from '../lib/types'
import { SECTIONS } from '../lib/types'
import Icon from './Icon'

/**
 * The length-check entry form.
 *
 * Overall length is the only required field. Per-section measurements are
 * behind a disclosure because most people measure one length and stop,
 * and asking for four numbers up front is how a tracking habit dies in
 * week two.
 */

const SECTION_LABELS: Record<Section, string> = {
  nape: 'Nape',
  crown: 'Crown',
  sides: 'Sides',
  front: 'Front',
}

export default function LogLengthCheck({
  unit,
  hasPrevious,
  onSave,
  onCancel,
}: {
  unit: LengthUnit
  /** Whether there is an earlier check for a trim to have happened since. */
  hasPrevious: boolean
  onSave: (check: LengthCheck) => void
  onCancel: () => void
}) {
  const [date, setDate] = useState(todayKey())
  const [overall, setOverall] = useState('')
  const [trimmed, setTrimmed] = useState('')
  const [sections, setSections] = useState<Partial<Record<Section, string>>>({})
  const [note, setNote] = useState('')
  const [showSections, setShowSections] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const value = Number.parseFloat(overall)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a length greater than zero.')
      return
    }
    // Compared as day keys, never as instants. `Date.parse` on a bare
    // `YYYY-MM-DD` reads it as UTC midnight, so east of Greenwich the
    // pre-filled value — today, in local time — parsed as the future and
    // this rejected it for the first hours of every day.
    if (date > todayKey()) {
      setError('A length check cannot be in the future.')
      return
    }

    // Blank means no trim. A typed value has to be a real, non-negative
    // length: a trim silently dropped would be read as breakage.
    let trimmedInches: number | undefined
    if (hasPrevious && trimmed.trim() !== '') {
      const cut = Number.parseFloat(trimmed)
      if (!Number.isFinite(cut) || cut < 0) {
        setError('Enter how much was trimmed, or leave it blank.')
        return
      }
      if (cut > 0) trimmedInches = fromDisplay(cut, unit)
    }

    const parsedSections: Partial<Record<Section, number>> = {}
    for (const section of SECTIONS) {
      const raw = sections[section]
      if (raw === undefined || raw.trim() === '') continue
      const parsed = Number.parseFloat(raw)
      if (Number.isFinite(parsed) && parsed > 0) {
        parsedSections[section] = fromDisplay(parsed, unit)
      }
    }

    onSave({
      id: newCheckId(),
      // Midday local, so the stored instant cannot land on the previous
      // day once it is serialised to UTC.
      dateISO: new Date(`${date}T12:00:00`).toISOString(),
      overall: fromDisplay(value, unit),
      sections: Object.keys(parsedSections).length > 0 ? parsedSections : undefined,
      trimmedInches,
      note: note.trim() || undefined,
    })
  }

  const inputClass =
    'w-full rounded-xl border-none bg-surface-container-lowest px-md py-3 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary/20'

  return (
    <section className="mb-2xl rounded-2xl border border-outline-variant/30 bg-surface-container p-lg">
      <h3 className="mb-lg font-headline-md text-headline-md text-primary">Log a length check</h3>

      <div className="space-y-md">
        <div>
          <label htmlFor="check-date" className="mb-xs block font-label-md text-label-md text-on-surface-variant">
            Date
          </label>
          <input
            id="check-date"
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="check-overall" className="mb-xs block font-label-md text-label-md text-on-surface-variant">
            Overall length ({unit === 'cm' ? 'cm' : 'inches'})
          </label>
          <input
            id="check-overall"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={overall}
            onChange={(e) => setOverall(e.target.value)}
            placeholder={unit === 'cm' ? 'e.g. 28' : 'e.g. 11'}
            className={inputClass}
          />
          <p className="mt-xs font-caption text-caption text-on-surface-variant">
            Measure stretched, from the scalp to the ends, on the same section every time
            &mdash; the crown is a good one &mdash; and on the same day of your wash week.
            Checks taken the same way are what make the trend precise.
          </p>
        </div>

        {hasPrevious && (
          <div>
            <label htmlFor="check-trimmed" className="mb-xs block font-label-md text-label-md text-on-surface-variant">
              Trimmed since your last check ({unit === 'cm' ? 'cm' : 'inches'}, optional)
            </label>
            <input
              id="check-trimmed"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={trimmed}
              onChange={(e) => setTrimmed(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
            <p className="mt-xs font-caption text-caption text-on-surface-variant">
              A trim is added back before retention is worked out, so cutting off split ends
              never counts as breakage.
            </p>
          </div>
        )}

        <div>
          <button
            type="button"
            aria-expanded={showSections}
            onClick={() => setShowSections((v) => !v)}
            className="flex items-center gap-xs font-label-md text-label-md text-primary"
          >
            <Icon name={showSections ? 'expand_less' : 'expand_more'} className="text-[18px]" />
            Per-section lengths (optional)
          </button>
          {showSections && (
            <div className="mt-md grid grid-cols-2 gap-md">
              {SECTIONS.map((section) => (
                <div key={section}>
                  <label
                    htmlFor={`check-${section}`}
                    className="mb-xs block font-caption text-caption text-on-surface-variant"
                  >
                    {SECTION_LABELS[section]}
                  </label>
                  <input
                    id={`check-${section}`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={sections[section] ?? ''}
                    onChange={(e) =>
                      setSections((prev) => ({ ...prev, [section]: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="check-note" className="mb-xs block font-label-md text-label-md text-on-surface-variant">
            Note (optional)
          </label>
          <input
            id="check-note"
            type="text"
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Day 3 after wash, banded overnight"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="font-body-md text-body-md text-error">
            {error}
          </p>
        )}

        <div className="flex gap-sm">
          <button
            type="button"
            onClick={submit}
            className="flex-1 rounded-full bg-primary py-3 font-label-md text-label-md text-on-primary transition-all active:scale-95"
          >
            Save check
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-outline px-lg py-3 font-label-md text-label-md text-on-surface-variant transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  )
}
