import { useId, useMemo, useState } from 'react'
import { formatLength, sortChecks, toDisplay } from '../lib/growth'
import type { LengthCheck, LengthUnit } from '../lib/types'

/**
 * Length over time.
 *
 * One series, so no legend — the section heading says what is plotted.
 * The check-in history list below this chart is its table view, so every
 * value is readable without touching the chart at all; the tooltip
 * enhances rather than gates.
 */

const VIEW_W = 320
const PLOT_H = 150
/** Room below the plot for the x-axis band, so labels are never clipped. */
const AXIS_H = 22
const PAD = { top: 16, right: 40, bottom: 8, left: 34 }

const INNER_W = VIEW_W - PAD.left - PAD.right
const INNER_H = PLOT_H - PAD.top - PAD.bottom

/** Round a domain out to a tidy step so the axis ticks read cleanly. */
function niceDomain(min: number, max: number): [number, number] {
  if (min === max) return [Math.max(0, min - 1), max + 1]
  const pad = (max - min) * 0.15
  const lo = Math.max(0, Math.floor((min - pad) * 2) / 2)
  const hi = Math.ceil((max + pad) * 2) / 2
  return [lo, hi]
}

export default function LengthChart({
  checks,
  unit,
}: {
  checks: LengthCheck[]
  unit: LengthUnit
}) {
  const clipId = useId()
  const [active, setActive] = useState<number | null>(null)

  const points = useMemo(() => {
    const sorted = sortChecks(checks)
    if (sorted.length === 0) return []

    const times = sorted.map((c) => Date.parse(c.dateISO))
    const values = sorted.map((c) => toDisplay(c.overall, unit))

    const tMin = times[0]
    const tMax = times[times.length - 1]
    const tSpan = tMax - tMin || 1
    const [vMin, vMax] = niceDomain(Math.min(...values), Math.max(...values))
    const vSpan = vMax - vMin || 1

    return sorted.map((check, i) => ({
      check,
      value: values[i],
      // A single check has no span to place itself along, so it centres.
      x: PAD.left + (sorted.length === 1 ? INNER_W / 2 : ((times[i] - tMin) / tSpan) * INNER_W),
      y: PAD.top + INNER_H - ((values[i] - vMin) / vSpan) * INNER_H,
      domain: [vMin, vMax] as [number, number],
    }))
  }, [checks, unit])

  if (points.length === 0) return null

  const [vMin, vMax] = points[0].domain
  const ticks = [vMin, vMin + (vMax - vMin) / 2, vMax]
  const last = points[points.length - 1]
  const shown = active !== null ? points[active] : null

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${VIEW_W} ${PLOT_H + AXIS_H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Length over time. ${points
          .map((p) => `${formatLength(p.check.overall, unit)} on ${new Date(p.check.dateISO).toLocaleDateString()}`)
          .join('; ')}`}
        onPointerLeave={() => setActive(null)}
        onPointerDown={(e) => {
          // Nearest point by x rather than requiring a hit on the 8px dot —
          // a fingertip cannot land on a dot that size.
          const rect = e.currentTarget.getBoundingClientRect()
          const x = ((e.clientX - rect.left) / rect.width) * VIEW_W
          let nearest = 0
          for (let i = 1; i < points.length; i++) {
            if (Math.abs(points[i].x - x) < Math.abs(points[nearest].x - x)) nearest = i
          }
          setActive(nearest)
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={0} width={INNER_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {/* Gridlines: solid hairlines, one step off the surface. */}
        {ticks.map((tick) => {
          const y = PAD.top + INNER_H - ((tick - vMin) / (vMax - vMin || 1)) * INNER_H
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + INNER_W}
                y1={y}
                y2={y}
                stroke="#c9ac8b"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-outline font-caption tabular-nums"
                fontSize={9}
              >
                {tick.toFixed(1)}
              </text>
            </g>
          )
        })}

        {points.length > 1 && (
          <g clipPath={`url(#${clipId})`}>
            {/* Area wash under the line, ~10% of the series hue. */}
            <path
              d={`${path} L${last.x} ${PAD.top + INNER_H} L${points[0].x} ${PAD.top + INNER_H} Z`}
              fill="#5a2108"
              opacity={0.1}
            />
            <path
              d={path}
              fill="none"
              stroke="#5a2108"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Crosshair for the selected point. */}
        {shown && (
          <line
            x1={shown.x}
            x2={shown.x}
            y1={PAD.top}
            y2={PAD.top + INNER_H}
            stroke="#5a2108"
            strokeWidth={1}
            opacity={0.4}
          />
        )}

        {/* Markers carry a 2px surface ring so they stay legible on the line. */}
        {points.map((p, i) => (
          <circle
            key={p.check.id}
            cx={p.x}
            cy={p.y}
            r={active === i ? 5 : 4}
            fill="#5a2108"
            stroke="#fbf4ec"
            strokeWidth={2}
          />
        ))}

        {/* Only the endpoint is directly labelled — a value on every point
            is noise, and the history list below carries the rest. */}
        <text
          x={Math.min(last.x + 8, VIEW_W - 2)}
          y={last.y + 3}
          className="fill-on-surface font-caption tabular-nums"
          fontSize={10}
          fontWeight={600}
        >
          {formatLength(last.check.overall, unit)}
        </text>

        {/* X-axis band: first and last only, so labels never collide. */}
        <text
          x={PAD.left}
          y={PLOT_H + 12}
          className="fill-outline font-caption"
          fontSize={9}
        >
          {new Date(points[0].check.dateISO).toLocaleDateString(undefined, {
            month: 'short',
            year: '2-digit',
          })}
        </text>
        {points.length > 1 && (
          <text
            x={PAD.left + INNER_W}
            y={PLOT_H + 12}
            textAnchor="end"
            className="fill-outline font-caption"
            fontSize={9}
          >
            {new Date(last.check.dateISO).toLocaleDateString(undefined, {
              month: 'short',
              year: '2-digit',
            })}
          </text>
        )}
      </svg>

      <figcaption
        className="mt-sm text-center font-caption text-caption text-on-surface-variant"
        aria-live="polite"
      >
        {shown ? (
          <>
            <span className="text-on-surface">{formatLength(shown.check.overall, unit)}</span>
            {' · '}
            {new Date(shown.check.dateISO).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {shown.check.note ? ` · ${shown.check.note}` : ''}
          </>
        ) : points.length > 1 ? (
          'Tap the chart to read a check.'
        ) : (
          'One check so far — log another to see the trend.'
        )}
      </figcaption>
    </figure>
  )
}
