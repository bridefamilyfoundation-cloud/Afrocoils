import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

/**
 * Header for pushed (non-tab) routes: back affordance plus title. Tab screens
 * use TopAppBar via AppLayout instead.
 */
export default function ScreenHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  const navigate = useNavigate()

  return (
    <header className="mb-lg">
      {/* The back affordance gets its own row rather than sitting beside the
          title. Inline, it pushed the headline 40px in from the content edge
          while the breadcrumb above it and the cards below it sat flush,
          which read as a ragged left margin on every screen using this. */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="-ml-2 mb-xs flex h-10 w-10 items-center justify-center rounded-full transition-colors active:scale-90"
      >
        <Icon name="arrow_back" className="text-primary" />
      </button>
      <h1 className="font-headline-lg text-headline-lg-mobile text-on-background">{title}</h1>
      {subtitle && (
        <p className="mt-xs font-body-md text-body-md text-on-surface-variant">{subtitle}</p>
      )}
    </header>
  )
}
