import type { ReactNode } from 'react'
import type { DiyArt } from '../lib/quiz'
import type {
  CurlPattern,
  Density,
  HairCondition,
  HairTexture,
  HairType,
  PorosityLevel,
  ScalpCondition,
} from '../lib/types'

/**
 * Hair Discovery's pictures, drawn rather than photographed.
 *
 * Every one is a diagram of Type 4 hair: coils, bends and zig-zags, never
 * a wave. They are inline SVG in the palette's own tokens (`stroke-on-surface`,
 * `fill-tertiary-fixed`), so they ship inside the bundle, work offline, and
 * follow `tailwind.config.js` like everything else, with no hex and no file
 * to license.
 *
 * They are diagrams, not portraits: each exaggerates the one thing its
 * card is about (the cuticle lifting, the scalp showing through a part)
 * so the difference reads at 96 pixels wide. All of them are decorative.
 * The card beside each one carries its label and its words, so they are
 * hidden from screen readers.
 */

function Frame({ viewBox = '0 0 120 90', children }: { viewBox?: string; children: ReactNode }) {
  const [, , w, h] = viewBox.split(' ').map(Number)
  return (
    <svg viewBox={viewBox} aria-hidden="true" focusable="false" className="block h-auto w-full">
      <rect width={w} height={h} rx="14" className="fill-surface-container" />
      {children}
    </svg>
  )
}

/** A small seeded generator, so a drawing is the same on every render. */
function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pts = (list: [number, number][]) =>
  list.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

/** A looping coil seen side on: the 4A spring. */
function coilPath(cx: number, y0: number, y1: number, radius: number, pitch: number) {
  const out: [number, number][] = []
  for (let t = 0; ; t += 0.2) {
    const y = y0 + pitch * t + radius * 0.45 * Math.cos(t)
    if (y > y1) break
    out.push([cx + radius * Math.sin(t), y])
  }
  return pts(out)
}

/** Sharp bends: the 4B Z and, tighter, the 4C zig-zag. */
function zigzagPath(cx: number, y0: number, y1: number, amp: number, step: number, jitter = 0, seed = 1) {
  const rand = seeded(seed)
  const out: [number, number][] = []
  let side = 1
  for (let y = y0; y <= y1; y += step) {
    out.push([cx + side * amp + (rand() - 0.5) * jitter, y])
    side = -side
  }
  return pts(out)
}

const strand = 'fill-none stroke-on-surface'

/* ------------------------------------------------------------------ *
 * Hair type: loose or loc'd
 * ------------------------------------------------------------------ */

export function HairTypeArt({ type }: { type: HairType }) {
  if (type === 'Locs') {
    return (
      <Frame>
        {[22, 38, 54, 70, 86, 102].map((x, i) => {
          const sway = i % 2 === 0 ? 4 : -4
          const d = `M${x} 10 C${x + sway} 32, ${x - sway} 56, ${x + sway / 2} ${78 - (i % 3) * 4}`
          return (
            <g key={x}>
              <path d={d} strokeWidth="10" strokeLinecap="round" className="fill-none stroke-on-surface" />
              {/* The matted texture: short cross-hatching inside the outline. */}
              <path
                d={d}
                strokeWidth="5"
                strokeLinecap="butt"
                strokeDasharray="2 2.5"
                className="fill-none stroke-tertiary-fixed-dim"
              />
            </g>
          )
        })}
      </Frame>
    )
  }
  return (
    <Frame>
      {[18, 32, 46, 60, 74, 88, 102].map((x, i) => (
        <path
          key={x}
          d={zigzagPath(x, 14 + (i % 2) * 4, 76 - (i % 3) * 3, 4.5, 4, 1.5, i + 3)}
          strokeWidth="1.6"
          strokeLinejoin="round"
          className={strand}
        />
      ))}
    </Frame>
  )
}

/* ------------------------------------------------------------------ *
 * Coil pattern
 * ------------------------------------------------------------------ */

export function CoilPatternArt({ pattern }: { pattern: CurlPattern }) {
  const xs = [32, 60, 88]
  return (
    <Frame>
      {xs.map((x, i) => {
        let d: string
        if (pattern === '4A') d = coilPath(x, 12, 80, 7, 1.7)
        else if (pattern === '4B') d = zigzagPath(x, 14, 78, 7, 7, 1, i + 1)
        // 4C shrinks the most: the same strand ends well short of the others.
        else d = zigzagPath(x, 22, 66, 4, 3.2, 2.2, i + 7)
        return (
          <path key={x} d={d} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className={strand} />
        )
      })}
    </Frame>
  )
}

/* ------------------------------------------------------------------ *
 * Porosity: the cuticle, side on, with water arriving from above
 * ------------------------------------------------------------------ */

function drop(x: number, y: number, s: number) {
  return `M${x} ${y - s} C${x + s * 0.9} ${y}, ${x + s * 0.75} ${y + s * 0.95}, ${x} ${y + s * 0.95} C${x - s * 0.75} ${y + s * 0.95}, ${x - s * 0.9} ${y}, ${x} ${y - s} Z`
}

export function PorosityArt({ level }: { level: PorosityLevel }) {
  const lift = level === 'Low' ? [0.6] : level === 'Medium' ? [3.5, 4.5] : [8, 11, 6.5]
  const scales = Array.from({ length: 8 }, (_, i) => {
    const x = 8 + i * 13
    const l = lift[i % lift.length]
    return `M${x} 46 L${x + 15} ${46 - l} L${x + 15} 46 Z`
  })
  const drops: { x: number; y: number; s: number; faint?: boolean }[] =
    level === 'Low'
      ? [
          { x: 28, y: 30, s: 6 },
          { x: 60, y: 31, s: 6.5 },
          { x: 92, y: 30, s: 6 },
        ]
      : level === 'Medium'
        ? [
            { x: 36, y: 24, s: 5.5 },
            { x: 74, y: 40, s: 4.5 },
          ]
        : [
            { x: 30, y: 41, s: 4 },
            { x: 69, y: 40, s: 4 },
            { x: 98, y: 14, s: 3.5, faint: true },
            { x: 50, y: 12, s: 3, faint: true },
          ]
  return (
    <Frame viewBox="0 0 120 80">
      <rect x="8" y="46" width="104" height="18" rx="3" className="fill-tertiary-fixed-dim stroke-on-surface" strokeWidth="1.2" />
      {scales.map((d) => (
        <path key={d} d={d} strokeWidth="1.2" strokeLinejoin="round" className="fill-tertiary-fixed stroke-on-surface" />
      ))}
      {drops.map((d) => (
        <path
          key={`${d.x}-${d.y}`}
          d={drop(d.x, d.y, d.s)}
          strokeWidth="1"
          className={`fill-secondary-container stroke-secondary ${d.faint ? 'opacity-50' : ''}`}
        />
      ))}
      {level === 'High' && (
        <path d="M98 24 L98 34 M50 22 L50 32" strokeWidth="1" strokeDasharray="2 2" className="fill-none stroke-secondary opacity-70" />
      )}
    </Frame>
  )
}

/* ------------------------------------------------------------------ *
 * The strand: the cuticle side on, then the three layers in section.
 * The Hair Guide's "The hair strand, simply explained". The paragraph
 * beside it names the layers, so the labels here are for the eye only.
 * ------------------------------------------------------------------ */

export function StrandArt() {
  const scales = Array.from({ length: 6 }, (_, i) => {
    const x = 10 + i * 10
    return `M${x} 52 Q${x + 6} 36 ${x + 13} 40 L${x + 13} 52 Z`
  })
  const label = 'fill-on-surface-variant font-label-md'
  return (
    <Frame viewBox="0 0 160 90">
      <rect x="8" y="40" width="68" height="18" rx="9" className="fill-tertiary-fixed-dim stroke-on-surface" strokeWidth="1.2" />
      {scales.map((d) => (
        <path key={d} d={d} strokeWidth="1.1" strokeLinejoin="round" className="fill-tertiary-fixed stroke-on-surface" />
      ))}
      <text x="8" y="74" fontSize="7" className={label}>
        Cuticle, side on
      </text>
      <circle cx="122" cy="44" r="26" strokeWidth="1.2" className="fill-tertiary-fixed stroke-on-surface" />
      <circle cx="122" cy="44" r="17" strokeWidth="1" className="fill-tertiary-fixed-dim stroke-on-surface" />
      <circle cx="122" cy="44" r="6" strokeWidth="1" strokeDasharray="2 1.5" className="fill-surface-container-lowest stroke-on-surface" />
      <text x="104" y="84" fontSize="7" className={label}>
        Cross-section
      </text>
      <text x="96" y="12" fontSize="6.5" className={label}>
        cuticle · cortex · medulla
      </text>
    </Frame>
  )
}

/* ------------------------------------------------------------------ *
 * Density: looking down at a part
 * ------------------------------------------------------------------ */

export function DensityArt({ density }: { density: Density }) {
  const count = density === 'Low' ? 22 : density === 'Medium' ? 46 : 84
  const gap = density === 'Low' ? 9 : density === 'Medium' ? 6 : 3.5
  const rand = seeded(density.length * 17)
  const coils: string[] = []
  let tries = 0
  while (coils.length < count && tries < count * 20) {
    tries++
    const x = 8 + rand() * 104
    const y = 8 + rand() * 66
    if (Math.abs(x - 60) < gap + 3) continue
    coils.push(zigzagPath(x, y, y + 9, 2, 2.2, 0.8, coils.length + 11))
  }
  return (
    <Frame>
      <rect x="4" y="4" width="112" height="82" rx="12" className="fill-tertiary-fixed" />
      {coils.map((d) => (
        <path key={d} d={d} strokeWidth="1.4" strokeLinejoin="round" className={strand} />
      ))}
      <path d={`M60 6 L60 84`} strokeWidth={gap * 0.6} strokeLinecap="round" className="fill-none stroke-tertiary-fixed" />
    </Frame>
  )
}

/* ------------------------------------------------------------------ *
 * Strand thickness: one strand, enlarged, against sewing thread
 * ------------------------------------------------------------------ */

export function ThicknessArt({ texture }: { texture: HairTexture }) {
  const width = texture === 'Fine' ? 1.1 : texture === 'Medium' ? 2.6 : 5
  return (
    <Frame viewBox="0 0 120 80">
      <path d="M10 56 L110 56" strokeWidth="2.6" strokeLinecap="round" className="fill-none stroke-outline" />
      <text x="12" y="70" fontSize="8" className="fill-on-surface-variant font-label-md">
        thread
      </text>
      <path
        d={pts(Array.from({ length: 15 }, (_, i) => [10 + i * 7, i % 2 === 0 ? 22 : 34] as [number, number]))}
        strokeWidth={width}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={strand}
      />
    </Frame>
  )
}

/* ------------------------------------------------------------------ *
 * Scalp: a patch of skin at the roots
 * ------------------------------------------------------------------ */

export function ScalpArt({ condition }: { condition: ScalpCondition }) {
  const rand = seeded(condition.length * 31)
  const roots = Array.from({ length: 9 }, (_, i) => 12 + i * 12)
  return (
    <Frame viewBox="0 0 120 80">
      <rect x="6" y="18" width="108" height="56" rx="10" className="fill-tertiary-fixed" />
      {roots.map((x, i) => (
        <path key={x} d={zigzagPath(x, 4, 20, 2.2, 2.6, 0.6, i + 5)} strokeWidth="1.5" strokeLinejoin="round" className={strand} />
      ))}
      {condition === 'Dry' &&
        [
          'M20 40 L30 46 L26 54',
          'M54 32 L60 40 L70 42',
          'M84 50 L92 56 L90 64',
          'M40 60 L48 58',
        ].map((d) => (
          <path key={d} d={d} strokeWidth="1.2" strokeLinecap="round" className="fill-none stroke-on-surface-variant opacity-60" />
        ))}
      {condition === 'Oily' && (
        <>
          <ellipse cx="34" cy="40" rx="14" ry="5" className="fill-surface-container-lowest opacity-90" />
          <ellipse cx="80" cy="54" rx="18" ry="6" className="fill-surface-container-lowest opacity-90" />
          {[
            [56, 36],
            [96, 38],
            [28, 60],
          ].map(([x, y]) => (
            <path key={x} d={drop(x, y, 3.5)} className="fill-tertiary-fixed-dim stroke-on-surface-variant" strokeWidth="0.8" />
          ))}
        </>
      )}
      {condition === 'Flaky' &&
        Array.from({ length: 16 }, (_, i) => {
          const x = 14 + rand() * 92
          const y = 26 + rand() * 42
          const s = 2 + rand() * 3
          return (
            <path
              key={i}
              d={`M${x} ${y} l${s} ${-s * 0.4} l${s * 0.6} ${s * 0.9} l${-s * 1.2} ${s * 0.5} Z`}
              strokeWidth="0.6"
              className="fill-surface-container-lowest stroke-outline"
            />
          )
        })}
      {condition === 'Sensitive' && (
        <>
          <ellipse cx="40" cy="46" rx="18" ry="10" className="fill-secondary-container opacity-80" />
          <ellipse cx="82" cy="56" rx="14" ry="8" className="fill-secondary-container opacity-80" />
          {[
            [34, 44],
            [44, 50],
            [80, 54],
            [86, 58],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" className="fill-secondary" />
          ))}
        </>
      )}
    </Frame>
  )
}

/* ------------------------------------------------------------------ *
 * Hair condition: a strand, and what has happened to it
 * ------------------------------------------------------------------ */

export function ConditionArt({ condition }: { condition: HairCondition }) {
  const xs = [34, 60, 86]
  return (
    <Frame>
      {xs.map((x, i) => {
        if (condition === 'Breakage-prone') {
          // Snapped strands, with the broken pieces lying beside them.
          const top = zigzagPath(x, 10, 40 + i * 6, 5, 5, 0.5, i + 2)
          const piece = zigzagPath(x + 3, 54 + i * 4, 66 + i * 4, 4, 4, 0.5, i + 9)
          return (
            <g key={x}>
              <path d={top} strokeWidth="2" strokeLinejoin="round" className={strand} />
              <path d={piece} strokeWidth="2" strokeLinejoin="round" className={strand} />
            </g>
          )
        }
        const d = zigzagPath(x, 10, 72, 5, 5, condition === 'Healthy' ? 0 : 2, i + 2)
        return (
          <g key={x}>
            <path d={d} strokeWidth="2" strokeLinejoin="round" className={strand} />
            {condition === 'Dry' &&
              // Frizz: fine broken fibres standing off the strand on both sides.
              [16, 26, 36, 46, 56, 66].map((y, k) => {
                const side = k % 2 === 0 ? 1 : -1
                return (
                  <path
                    key={y}
                    d={`M${x + side * 4} ${y + i} l${side * 6} ${-3 - (k % 3)} M${x + side * 4} ${y + i + 2} l${side * 5} ${2 + (k % 2)}`}
                    strokeWidth="1"
                    strokeLinecap="round"
                    className="fill-none stroke-on-surface-variant"
                  />
                )
              })}
            {condition === 'Damaged' && (
              <path
                d={`M${x + 5} 72 L${x + 1} 82 M${x + 5} 72 L${x + 10} 81`}
                strokeWidth="1.6"
                strokeLinecap="round"
                className="fill-none stroke-on-surface"
              />
            )}
          </g>
        )
      })}
    </Frame>
  )
}

/* ------------------------------------------------------------------ *
 * Try It at Home: what to do, step by step
 *
 * The result pictures above show what you might *find*; these show what
 * to *do* — a spray bottle, a mirror, a strand on paper beside thread.
 * Same palette, same frame, same rule: diagrams, not portraits.
 * ------------------------------------------------------------------ */

const outline = 'stroke-on-surface'
const skin = 'fill-tertiary-fixed stroke-on-surface'
const light = 'fill-surface-container-lowest stroke-on-surface'
const label = 'fill-on-surface-variant font-label-md'

function Fingertip({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <g transform={`rotate(${angle} ${x} ${y})`}>
      <rect x={x - 9} y={y - 26} width="18" height="34" rx="9" strokeWidth="1.4" className={skin} />
      <path
        d={`M${x - 5} ${y - 18} Q${x} ${y - 23} ${x + 5} ${y - 18}`}
        strokeWidth="1"
        className="fill-none stroke-on-surface-variant"
      />
    </g>
  )
}

function Magnifier({ cx, cy, r, children }: { cx: number; cy: number; r: number; children?: ReactNode }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} strokeWidth="3" className={light} />
      {children}
      <path
        d={`M${cx + r * 0.7} ${cy + r * 0.7} L${cx + r * 1.4} ${cy + r * 1.4}`}
        strokeWidth="6"
        strokeLinecap="round"
        className={`fill-none ${outline}`}
      />
    </g>
  )
}

/** A short horizontal zig-zag strand, for strands lying flat. */
function flat(x0: number, y: number, count: number, step = 4.4, amp = 3) {
  return pts(Array.from({ length: count }, (_, i) => [x0 + i * step, i % 2 ? y - amp : y + amp] as [number, number]))
}

function DiySpray() {
  const mist: [number, number][] = [
    [52, 14],
    [58, 20],
    [54, 26],
    [63, 14],
    [66, 25],
    [72, 19],
  ]
  return (
    <Frame viewBox="0 0 120 80">
      <rect x="14" y="32" width="26" height="40" rx="5" strokeWidth="1.6" className={light} />
      <rect x="20" y="24" width="14" height="8" strokeWidth="1.4" className={light} />
      <path d="M20 24 L20 15 L41 15 L44 20 L34 24 Z" strokeWidth="1.4" strokeLinejoin="round" className={light} />
      {mist.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" className="fill-secondary opacity-70" />
      ))}
      {[84, 96, 108].map((x, i) => (
        <path
          key={x}
          d={zigzagPath(x, 18 + i * 2, 70, 4, 4, 1, i + 21)}
          strokeWidth="1.8"
          strokeLinejoin="round"
          className={strand}
        />
      ))}
      <path d={drop(90, 34, 3)} className="fill-secondary-container stroke-secondary" strokeWidth="0.8" />
      <path d={drop(102, 46, 3)} className="fill-secondary-container stroke-secondary" strokeWidth="0.8" />
    </Frame>
  )
}

function DiyLook() {
  return (
    <Frame viewBox="0 0 120 80">
      {[16, 28].map((x, i) => (
        <path
          key={x}
          d={zigzagPath(x, 10, 70, 4, 4, 1, i + 31)}
          strokeWidth="1.8"
          strokeLinejoin="round"
          className={strand}
        />
      ))}
      <Magnifier cx={64} cy={32} r={20}>
        <path d={coilPath(64, 16, 48, 6, 1.2)} strokeWidth="2.2" strokeLinecap="round" className={strand} />
      </Magnifier>
    </Frame>
  )
}

function DiyTimer() {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6
    return `M${(44 + 19 * Math.sin(a)).toFixed(1)} ${(42 - 19 * Math.cos(a)).toFixed(1)} L${(44 + 22 * Math.sin(a)).toFixed(1)} ${(42 - 22 * Math.cos(a)).toFixed(1)}`
  })
  return (
    <Frame viewBox="0 0 120 80">
      <circle cx="44" cy="42" r="26" strokeWidth="2" className={light} />
      <rect x="40" y="10" width="8" height="6" rx="1.5" className="fill-on-surface" />
      {ticks.map((d) => (
        <path key={d} d={d} strokeWidth="1.2" className={`fill-none ${outline}`} />
      ))}
      <path
        d="M44 42 L44 28 M44 42 L54 48"
        strokeWidth="2.2"
        strokeLinecap="round"
        className={`fill-none ${outline}`}
      />
      <path d={drop(92, 54, 8)} strokeWidth="1.2" className="fill-secondary-container stroke-secondary" />
      <path
        d="M92 38 L92 22 M87 27 L92 22 L97 27"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="fill-none stroke-secondary opacity-70"
      />
    </Frame>
  )
}

function DiyGlass() {
  return (
    <Frame viewBox="0 0 120 80">
      <path d="M31.3 26 L88.7 26 L84 72 L36 72 Z" className="fill-secondary-container opacity-60" />
      <path
        d="M30 10 L90 10 L84 72 L36 72 Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className={`fill-none ${outline}`}
      />
      <path d={flat(44, 25, 9, 4, 2.4)} strokeWidth="1.4" strokeLinejoin="round" className={strand} />
      <path d={flat(52, 67, 7, 4, 2.4)} strokeWidth="1.4" strokeLinejoin="round" className={strand} />
      <text x="96" y="29" fontSize="10" className={label}>
        ?
      </text>
      <text x="96" y="70" fontSize="10" className={label}>
        ?
      </text>
    </Frame>
  )
}

function DiyMirror() {
  return (
    <Frame viewBox="0 0 120 80">
      <rect x="56" y="58" width="8" height="18" rx="3" strokeWidth="1.4" className={light} />
      <ellipse cx="60" cy="34" rx="28" ry="27" strokeWidth="3" className={light} />
      {/* The reflection: a crown of Type 4 hair with a part down it. */}
      {[42, 48, 54, 66, 72, 78].map((x, i) => (
        <path
          key={x}
          d={zigzagPath(x, 16 + Math.abs(60 - x) / 2, 50, 2.2, 2.4, 0.8, i + 41)}
          strokeWidth="1.4"
          strokeLinejoin="round"
          className={strand}
        />
      ))}
      <path d="M60 12 L60 54" strokeWidth="3" className="fill-none stroke-tertiary-fixed-dim" />
    </Frame>
  )
}

function DiyPart() {
  // Rows of coils either side, leaving a clean part down the middle.
  const coils: string[] = []
  for (const x of [12, 22, 32, 42, 78, 88, 98, 108]) {
    for (const y of [8, 26, 44, 62]) {
      coils.push(zigzagPath(x, y, y + 12, 2.6, 2.4, 0.8, x + y))
    }
  }
  return (
    <Frame viewBox="0 0 120 80">
      <rect x="51" y="6" width="18" height="70" rx="9" className="fill-tertiary-fixed-dim" />
      {coils.map((d) => (
        <path key={d} d={d} strokeWidth="1.4" strokeLinejoin="round" className={strand} />
      ))}
      {/* A comb tail drawing the part. */}
      <path d="M60 4 L60 36" strokeWidth="2.4" strokeLinecap="round" className="fill-none stroke-outline" />
    </Frame>
  )
}

function DiyPaper() {
  return (
    <Frame viewBox="0 0 120 80">
      <rect
        x="10"
        y="8"
        width="100"
        height="64"
        rx="3"
        strokeWidth="1"
        className="fill-surface-container-lowest stroke-outline-variant"
      />
      <path d={flat(18, 30, 19)} strokeWidth="2.2" strokeLinejoin="round" className={strand} />
      <path d="M18 54 L102 54" strokeWidth="2.4" strokeLinecap="round" className="fill-none stroke-outline" />
      <text x="18" y="46" fontSize="8" className={label}>
        your strand
      </text>
      <text x="18" y="66" fontSize="8" className={label}>
        thread
      </text>
    </Frame>
  )
}

function DiyRoll() {
  return (
    <Frame viewBox="0 0 120 80">
      <path d={zigzagPath(60, 4, 76, 3, 3, 0.5, 61)} strokeWidth="1.6" strokeLinejoin="round" className={strand} />
      <Fingertip x={46} y={46} angle={-70} />
      <Fingertip x={74} y={34} angle={110} />
      <path
        d="M24 26 Q30 14 42 16 M38 12 L42 16 L37 19"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="fill-none stroke-secondary"
      />
      <path
        d="M96 54 Q90 66 78 64 M82 68 L78 64 L83 61"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="fill-none stroke-secondary"
      />
    </Frame>
  )
}

function DiyComb() {
  const teeth = Array.from({ length: 14 }, (_, i) => `M${18 + i * 6} 34 L${18 + i * 6} 58`)
  return (
    <Frame viewBox="0 0 120 80">
      <rect x="12" y="20" width="90" height="14" rx="4" strokeWidth="1.4" className={light} />
      {teeth.map((d) => (
        <path key={d} d={d} strokeWidth="2.2" strokeLinecap="round" className="fill-none stroke-on-surface-variant" />
      ))}
      {[30, 54, 76].map((x) => (
        <path
          key={x}
          d={pts(Array.from({ length: 12 }, (_, i) => [x + (i % 2 ? 3 : -3) + i * 1.2, 30 + i * 4] as [number, number]))}
          strokeWidth="1.3"
          strokeLinejoin="round"
          className={strand}
        />
      ))}
    </Frame>
  )
}

function DiyShedBroken() {
  return (
    <Frame viewBox="0 0 120 80">
      <path d={flat(12, 20, 21)} strokeWidth="1.6" strokeLinejoin="round" className={strand} />
      <circle cx="104" cy="20" r="3.6" strokeWidth="1.2" className="fill-surface-container-lowest stroke-on-surface" />
      <text x="12" y="38" fontSize="8" className={label}>
        shed: full length, white bulb
      </text>
      <path d={flat(12, 56, 6)} strokeWidth="1.6" strokeLinejoin="round" className={strand} />
      <path d={flat(48, 56, 4)} strokeWidth="1.6" strokeLinejoin="round" className={strand} />
      <text x="12" y="74" fontSize="8" className={label}>
        broken: short, no bulb
      </text>
    </Frame>
  )
}

function DiyStretch() {
  return (
    <Frame viewBox="0 0 120 80">
      <path d={flat(30, 40, 15, 4.3, 1.8)} strokeWidth="1.6" strokeLinejoin="round" className={strand} />
      <Fingertip x={26} y={40} angle={-90} />
      <Fingertip x={94} y={40} angle={90} />
      <path
        d="M44 62 L28 62 M32 58 L28 62 L32 66 M76 62 L92 62 M88 58 L92 62 L88 66"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="fill-none stroke-secondary"
      />
    </Frame>
  )
}

function DiyEnds() {
  return (
    <Frame viewBox="0 0 120 80">
      <path d={zigzagPath(84, 4, 70, 4, 4, 0.5, 72)} strokeWidth="1.8" strokeLinejoin="round" className={strand} />
      <path d={zigzagPath(40, 4, 44, 4, 4, 1, 71)} strokeWidth="1.8" strokeLinejoin="round" className={strand} />
      <Magnifier cx={40} cy={52} r={14}>
        <path
          d="M40 44 L34 60 M40 44 L47 58"
          strokeWidth="1.8"
          strokeLinecap="round"
          className={`fill-none ${outline}`}
        />
      </Magnifier>
    </Frame>
  )
}

function DiyTouch() {
  return (
    <Frame viewBox="0 0 120 80">
      <rect x="6" y="46" width="108" height="30" rx="8" className="fill-tertiary-fixed-dim" />
      {[14, 26, 38, 84, 96, 108].map((x, i) => (
        <path
          key={x}
          d={zigzagPath(x, 24, 48, 2.2, 2.6, 0.6, i + 81)}
          strokeWidth="1.5"
          strokeLinejoin="round"
          className={strand}
        />
      ))}
      <Fingertip x={60} y={50} angle={15} />
    </Frame>
  )
}

const DIY_ART: Record<DiyArt, () => ReactNode> = {
  spray: DiySpray,
  look: DiyLook,
  timer: DiyTimer,
  glass: DiyGlass,
  mirror: DiyMirror,
  part: DiyPart,
  paper: DiyPaper,
  roll: DiyRoll,
  comb: DiyComb,
  'shed-broken': DiyShedBroken,
  stretch: DiyStretch,
  ends: DiyEnds,
  touch: DiyTouch,
}

/** One "Try It at Home" step drawing. */
export function DiyArtwork({ art }: { art: DiyArt }) {
  const Drawing = DIY_ART[art]
  return <>{Drawing()}</>
}
