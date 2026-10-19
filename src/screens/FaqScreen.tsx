import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { FAQS, type Faq } from '../content/faq'
import { useOpenParam, useScrollToOpened } from '../lib/deep-link'

/**
 * The questions people actually ask, at `/faq`.
 *
 * Five, and they are the five this app genuinely gets asked rather than
 * five invented to fill a page: where the data goes, whether any of it
 * is AI, why the library is thin for locs, why the ranking ignores
 * porosity, and what happens to a contributed style.
 *
 * The words live in content/faq.ts, because Ask quotes them too and an
 * answer that exists twice is an answer that drifts. `?open=<id>` opens
 * one, which is how Ask lands here.
 */

function Answer({ faq }: { faq: Faq }) {
  return (
    <>
      {faq.a.map((segment, i) =>
        typeof segment === 'string' ? (
          segment
        ) : 'to' in segment ? (
          <Link key={i} to={segment.to} className="text-primary underline">
            {segment.label}
          </Link>
        ) : (
          <em key={i}>{segment.em}</em>
        ),
      )}
    </>
  )
}

export default function FaqScreen() {
  // Open the first by default: a page of collapsed headings makes the
  // reader work to find out whether any of it is relevant.
  const requested = useOpenParam()
  const [open, setOpen] = useState<number | null>(() => {
    const i = FAQS.findIndex((faq) => faq.id === requested)
    return i >= 0 ? i : 0
  })
  useScrollToOpened(requested && FAQS.some((faq) => faq.id === requested) ? `faq-q-${requested}` : null)

  return (
    <>
      <section className="mb-xl text-center">
        <h2 className="mb-sm font-headline-lg text-headline-lg text-on-background">
          Frequently asked questions
        </h2>
        <p className="mx-auto max-w-md font-body-md text-body-md text-on-surface-variant">
          Five things worth knowing before you rely on this app.
        </p>
      </section>

      <section className="mb-2xl space-y-sm">
        {FAQS.map((faq, i) => {
          const isOpen = open === i
          return (
            <article
              key={faq.id}
              id={`faq-q-${faq.id}`}
              className="scroll-mt-24 overflow-hidden rounded-xl shadow-card bg-surface-container-lowest"
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center gap-md p-lg text-left transition-colors active:scale-[0.99]"
                >
                  <span className="flex-1 font-headline-md text-body-lg text-on-surface">
                    {faq.q}
                  </span>
                  <Icon
                    name={isOpen ? 'expand_less' : 'expand_more'}
                    className="shrink-0 text-outline"
                  />
                </button>
              </h3>
              <div id={`faq-${i}`} hidden={!isOpen} className="px-lg pb-lg">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  <Answer faq={faq} />
                </p>
              </div>
            </article>
          )
        })}
      </section>

      <section className="rounded-2xl bg-surface-container p-lg text-center">
        <p className="mb-md font-body-md text-body-md text-on-surface-variant">
          Something else? Ask finds the answer anywhere in the app. The About page covers what
          the app is for, and Contact is the way to reach the people who make it.
        </p>
        <div className="flex flex-wrap justify-center gap-sm">
          <Link
            to="/ask"
            className="rounded-full bg-primary-container px-lg py-2 font-label-md text-label-md text-on-primary-container active:scale-95"
          >
            Ask a question
          </Link>
          <Link
            to="/about"
            className="rounded-full bg-primary px-lg py-2 font-label-md text-label-md text-on-primary active:scale-95"
          >
            About Afrocoil
          </Link>
          <Link
            to="/legal/contact"
            className="rounded-full border border-outline-variant px-lg py-2 font-label-md text-label-md text-on-surface active:scale-95"
          >
            Contact us
          </Link>
        </div>
      </section>
    </>
  )
}
