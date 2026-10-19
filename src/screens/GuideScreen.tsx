import { Navigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'
import SectionCrumb from '../components/SectionCrumb'
import { getGuide } from '../content/guides'

/** Renders any care guide from src/content/guides.ts. */
export default function GuideScreen() {
  const { slug } = useParams()
  const guide = getGuide(slug)

  // Unknown slug: send the user somewhere real rather than showing an error.
  if (!guide) return <Navigate to="/sos" replace />

  return (
    <>
      <SectionCrumb to="/sos/problem" label="Hair Problem" />
      <ScreenHeader title={guide.title} />

      <section className={`mb-2xl rounded-2xl p-xl ${guide.theme}`}>
        {guide.badge && (
          <span className="mb-md inline-block rounded-full bg-secondary px-3 py-1 font-label-md text-caption uppercase text-on-secondary">
            {guide.badge}
          </span>
        )}
        <div className="mb-md flex items-center gap-sm">
          <Icon name={guide.icon} className="text-3xl" />
          <span className="flex items-center gap-xs font-label-md text-label-md">
            <Icon name="schedule" className="text-[16px]" />
            {guide.minutes} min
          </span>
        </div>
        <p className="font-body-lg text-body-md">{guide.summary}</p>
      </section>

      <section className="mb-2xl">
        <h2 className="mb-md font-label-md text-label-md uppercase tracking-widest text-primary">
          What you&rsquo;ll need
        </h2>
        <ul className="flex flex-wrap gap-xs">
          {guide.toolsAndProducts.map((item) => (
            <li
              key={item}
              className="rounded-full bg-surface-container-high px-3 py-1 font-body-md text-caption text-on-surface"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-2xl">
        <h2 className="mb-md font-label-md text-label-md uppercase tracking-widest text-primary">
          Steps
        </h2>
        <ol className="space-y-lg">
          {guide.steps.map((step, i) => (
            <li key={step.title} className="flex gap-md">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-label-md text-label-md text-on-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="mb-xs font-headline-md text-body-lg text-on-surface">
                  {step.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {guide.sources && guide.sources.length > 0 && (
        /*
         * Plain anchors with target="_blank" rather than the Browser
         * plugin: Capacitor's bridge already sends navigations to an
         * external origin out to the system browser instead of loading
         * them in the WebView, so this needs no native dependency and
         * cannot strand the user outside the app.
         *
         * These are the only outbound links in the app. They are
         * user-initiated navigations, not assets — the offline rule
         * still holds, and every guide reads in full with no network.
         */
        <section className="mb-2xl">
          <h2 className="mb-sm font-label-md text-label-md uppercase tracking-widest text-primary">
            What this is based on
          </h2>
          <p className="mb-md font-caption text-caption text-on-surface-variant">
            Written for this app, not copied from anywhere. These are the sources behind the
            claims in it, so you can check them.
          </p>
          <ul className="space-y-xs">
            {guide.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-sm rounded-xl bg-surface-container-lowest p-md font-body-md text-caption text-on-surface-variant transition-all active:scale-[0.98]"
                >
                  <Icon name="open_in_new" className="mt-0.5 shrink-0 text-[14px] text-outline" />
                  <span className="min-w-0 flex-1 underline decoration-outline/40">
                    {source.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-2xl rounded-2xl border border-error/20 bg-error-container p-lg">
        <h2 className="mb-sm flex items-center gap-sm font-label-md text-label-md uppercase tracking-widest text-on-error-container">
          <Icon name="shield" className="text-[18px]" />
          Before you start
        </h2>
        <ul className="space-y-sm">
          {guide.cautions.map((caution) => (
            <li key={caution} className="font-body-md text-body-md text-on-error-container">
              {caution}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
