import type { ReactNode } from 'react'

/** The few pieces every page draws, in the app's tokens. */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-surface-container-lowest p-lg shadow-card ${className}`}>{children}</div>
}

export function Button({
  children,
  onClick,
  kind = 'primary',
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'primary' | 'quiet' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const look = {
    primary: 'bg-secondary text-on-secondary',
    quiet: 'bg-surface-container-high text-on-surface',
    danger: 'bg-error-container text-on-error-container',
  }[kind]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-md py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${look}`}
    >
      {children}
    </button>
  )
}

export const input =
  'rounded-xl border-outline-variant bg-surface px-md py-2 text-sm text-on-surface focus:border-secondary focus:ring-secondary'

export function Problem({ error }: { error: string | null }) {
  if (!error) return null
  return <p role="alert" className="mb-md rounded-xl bg-error-container p-md text-sm text-on-error-container">{error}</p>
}

export function Pill({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'good' | 'warn' | 'bad' }) {
  const look = {
    plain: 'bg-surface-container-high text-on-surface',
    good: 'bg-primary-container text-on-primary-container',
    warn: 'bg-secondary-fixed text-on-surface',
    bad: 'bg-error-container text-on-error-container',
  }[tone]
  return <span className={`inline-block rounded-full px-sm py-0.5 text-xs font-bold ${look}`}>{children}</span>
}
