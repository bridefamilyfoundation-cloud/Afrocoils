import type { ReactNode } from 'react'

/**
 * The pieces every page draws, in the app's tokens.
 *
 * The admin is a tool for working through queues, so the vocabulary is
 * small on purpose: a page header, a panel of divided rows, a segmented
 * filter, a pill for state. Orange means "a person is needed here"
 * everywhere it appears (the primary button, a waiting count, a pending
 * pill); espresso means selected or settled.
 */

/* ------------------------------------------------------------------ *
 * Icons: drawn here, one stroke, because the admin loads no icon font.
 * ------------------------------------------------------------------ */

const ICONS = {
  overview: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  members: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.2a3.25 3.25 0 0 1 0 5.6" />
      <path d="M18 14c1.9.7 3 2.4 3 5" />
    </>
  ),
  transfers: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7" />
      <path d="M3 20h18" />
    </>
  ),
  payments: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7.5 8.5 5.5 8.5-5.5" />
    </>
  ),
  submissions: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 15-4.5-4.5L7 20" />
    </>
  ),
  questions: (
    <>
      <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.2-4.6A8.5 8.5 0 1 1 21 12Z" />
      <path d="M9.8 9.6a2.3 2.3 0 1 1 3.3 2.1c-.7.4-1.1.9-1.1 1.7" />
      <path d="M12 16.4v.1" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  back: <path d="m15 6-6 6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  signout: (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="m10 16-4-4 4-4M6 12h9" />
    </>
  ),
} as const
export type IconName = keyof typeof ICONS

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      {ICONS[name]}
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * Page furniture
 * ------------------------------------------------------------------ */

/** The title of a page, one line about it, and its filters or actions. */
export function PageHeader({
  title,
  lede,
  back,
  children,
}: {
  title: ReactNode
  lede?: ReactNode
  /** Shown above the title on a screen one level down (a conversation, a draft). */
  back?: { label: string; onClick: () => void }
  children?: ReactNode
}) {
  return (
    <header className="mb-lg">
      {back && (
        <button
          type="button"
          onClick={back.onClick}
          className="-ml-1 mb-sm inline-flex items-center gap-xs rounded-full py-1 pr-sm text-sm font-semibold text-on-surface-variant hover:text-primary"
        >
          <Icon name="back" className="h-4 w-4" />
          {back.label}
        </button>
      )}
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div className="min-w-0 max-w-2xl">
          <h1 className="break-words text-2xl font-bold tracking-tight text-primary [text-wrap:balance]">{title}</h1>
          {lede && <p className="mt-xs text-sm text-on-surface-variant [text-wrap:pretty]">{lede}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-sm">{children}</div>}
      </div>
    </header>
  )
}

/** A heading for a second block on a page. */
export function SectionTitle({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-sm mt-2xl max-w-2xl">
      <h2 className="text-lg font-bold text-primary">{children}</h2>
      {note && <p className="mt-xs text-sm text-on-surface-variant [text-wrap:pretty]">{note}</p>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-surface-container-lowest p-lg shadow-card ${className}`}>{children}</div>
}

/** One white surface holding rows, divided by hairlines rather than gaps. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`divide-y divide-outline-variant/40 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * What a list shows before it has rows: placeholders while the first
 * load is in flight, the empty line when it came back with nothing.
 * Returns null once there is something to draw (or an error, which
 * `Problem` reports).
 */
export function ListState({
  data,
  error,
  empty,
}: {
  data: readonly unknown[] | undefined
  error: string | null
  empty: string
}) {
  if (data === undefined) {
    if (error) return null
    return (
      <Panel>
        <span className="sr-only" role="status">
          Loading
        </span>
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden className="animate-pulse space-y-sm px-lg py-md motion-reduce:animate-none">
            <div className="h-3 w-1/3 rounded-full bg-surface-container-high" />
            <div className="h-3 w-2/3 rounded-full bg-surface-container" />
          </div>
        ))}
      </Panel>
    )
  }
  if (data.length > 0) return null
  return (
    <Panel>
      <p className="px-lg py-xl text-center text-sm text-on-surface-variant">{empty}</p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */

export function Button({
  children,
  onClick,
  kind = 'primary',
  size = 'md',
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'primary' | 'quiet' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const look = {
    primary: 'bg-secondary text-on-secondary hover:brightness-95',
    quiet: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
    danger: 'bg-error-container text-on-error-container hover:brightness-95',
  }[kind]
  const scale = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-md py-2 text-sm'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center gap-xs whitespace-nowrap rounded-full font-bold transition active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${scale} ${look}`}
    >
      {children}
    </button>
  )
}

/** One of a few views of the same list. Selected is espresso, as in the app. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-full bg-surface-container-high p-1">
      {options.map((option) => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={`whitespace-nowrap rounded-full px-md py-1.5 text-sm font-semibold transition-colors ${
              on ? 'bg-inverse-surface text-inverse-on-surface shadow-card' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export const input =
  'rounded-xl border-outline-variant bg-surface-bright px-md py-2 text-sm text-on-surface placeholder:text-on-surface-variant/80 focus:border-secondary focus:ring-secondary'

export const checkbox = 'h-5 w-5 rounded border-outline text-tertiary focus:ring-secondary focus:ring-offset-0'

/** A labelled control. The label is the name; a placeholder is only ever an example. */
export function Field({
  label,
  hint,
  className = '',
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-xs text-sm font-semibold text-on-surface ${className}`}>
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-on-surface-variant">{hint}</span>}
    </label>
  )
}

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

export function Problem({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="mb-md rounded-xl bg-error-container px-md py-sm text-sm font-semibold text-on-error-container">
      {error}
    </p>
  )
}

/**
 * `warn` is the orange: something is waiting for a person. `good` is
 * the espresso: settled. `bad` is the one colour outside the palette.
 */
export function Pill({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'good' | 'warn' | 'bad' }) {
  const look = {
    plain: 'bg-surface-container-high text-on-surface',
    good: 'bg-inverse-surface text-inverse-on-surface',
    warn: 'bg-secondary text-on-secondary',
    bad: 'bg-error-container text-on-error-container',
  }[tone]
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-sm py-0.5 text-xs font-bold ${look}`}>{children}</span>
  )
}

/** A label and its value, for the facts a decision is checked against. */
export function Facts({ rows }: { rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="grid content-start gap-x-md gap-y-sm text-sm sm:grid-cols-[11rem_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="sm:contents">
          <dt className="text-on-surface-variant">{label}</dt>
          <dd className="whitespace-pre-wrap break-words font-semibold text-on-surface">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
