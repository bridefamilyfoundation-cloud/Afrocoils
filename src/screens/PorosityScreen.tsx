import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'
import SectionCrumb from '../components/SectionCrumb'
import { useHairProfile } from '../lib/profile-store'
import {
  POROSITY_MAX_SCORE,
  porosityFor,
  porosityQuestionsFor,
} from '../lib/porosity'
import type { PorosityLevel } from '../lib/types'

/**
 * Porosity self-assessment.
 *
 * The questions and the scoring live in lib/porosity.ts — the full hair
 * quiz runs the same five questions, and a second copy here would drift
 * from that one. This screen is the standalone route: the same test with
 * the long-form result and advice attached.
 */

const RESULTS: Record<
  Lowercase<PorosityLevel>,
  { label: string; icon: IconName; theme: string; summary: string; advice: string[] }
> = {
  low: {
    label: 'Low porosity',
    icon: 'shield' as const,
    theme: 'bg-tertiary-fixed text-on-tertiary-fixed',
    summary:
      'Your cuticles lie flat and tight. Moisture struggles to get in — but once it is in, it stays.',
    advice: [
      'Apply product to warm, damp hair; gentle heat helps the cuticle open.',
      'Favour lightweight liquids and milks over heavy butters, which sit on top.',
      'Clarify regularly — low porosity hair builds up product quickly.',
      'Skip heavy protein unless you have real breakage; it can stiffen the hair.',
    ],
  },
  medium: {
    label: 'Medium porosity',
    icon: 'check_circle' as const,
    theme: 'bg-secondary-fixed text-on-secondary-fixed',
    summary:
      'The easiest type to work with. Your cuticle takes moisture in readily and holds it a reasonable time.',
    advice: [
      'Keep a balanced routine — moisture most weeks, protein occasionally.',
      'Deep condition every one to two weeks.',
      'Watch for change: colour and heat push hair towards high porosity.',
    ],
  },
  high: {
    label: 'High porosity',
    icon: 'water_drop' as const,
    theme: 'bg-primary-container text-on-primary-container',
    summary:
      'Your cuticles are raised, so water goes in fast and leaves just as fast. The work is in sealing, not soaking.',
    advice: [
      'Seal after every wet application — the L.O.C. method exists for this.',
      'Use heavier butters and creams, especially in dry weather.',
      'Protein treatments help fill the gaps in the cuticle; monthly is a fair start.',
      'Sleep in satin. Cotton pulls out overnight everything you sealed in.',
    ],
  },
}

export default function PorosityScreen() {
  const { profile, update } = useHairProfile()
  const [answers, setAnswers] = useState<Record<string, number>>({})

  // Loc wearers get the loc phrasing of the history question. Same five
  // questions, same scoring — only the wording of the last one changes.
  const questions = porosityQuestionsFor(profile.identity.hairType)

  const answered = Object.keys(answers).length
  const complete = answered === questions.length
  const total = Object.values(answers).reduce((sum, n) => sum + n, 0)
  const level = porosityFor(total)
  const result = RESULTS[level.toLowerCase() as Lowercase<PorosityLevel>]

  /** The result on file from a previous run, shown before this one completes. */
  const stored = profile.identity.porosity

  function answer(questionId: string, score: number) {
    const next = { ...answers, [questionId]: score }
    setAnswers(next)

    // Persist as soon as the last answer lands, and on every change after —
    // the point of the test is that its result outlives the screen. Written
    // here rather than in an effect so the save is tied to the user's action.
    if (Object.keys(next).length === questions.length) {
      const sum = Object.values(next).reduce((a, b) => a + b, 0)
      update({
        identity: { ...profile.identity, porosity: porosityFor(sum) },
        porosityTest: {
          score: sum,
          max: POROSITY_MAX_SCORE,
          takenISO: new Date().toISOString(),
        },
      })
    }
  }

  return (
    <>
      <SectionCrumb to="/care" label="Hair Care" />
      <ScreenHeader
        title="Porosity Test"
        subtitle="Five questions. Porosity is how easily your hair takes in and holds water — it drives almost every product decision."
      />

      {stored && !complete && (
        <p className="mb-lg rounded-xl bg-surface-container p-md font-body-md text-body-md text-on-surface-variant">
          On file: <span className="text-on-surface">{stored.toLowerCase()} porosity</span>.
          Answer again to update it.
        </p>
      )}

      <div
        className="mb-lg h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
        role="progressbar"
        aria-valuenow={answered}
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-label="Questions answered"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(answered / questions.length) * 100}%` }}
        />
      </div>

      <section className="mb-2xl space-y-lg">
        {questions.map((question, i) => (
          // Deliberately not a fieldset/legend. A legend is painted into the
          // fieldset's border rather than laid out inside it, so the counter
          // sat above the card's background and one step further left than
          // the question beneath it. A labelled group reads the same to a
          // screen reader and stays in flow.
          <div
            key={question.id}
            role="group"
            aria-labelledby={`porosity-${question.id}-prompt`}
            className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-lg"
          >
            <p className="mb-xs font-caption text-caption uppercase tracking-widest text-outline">
              {i + 1} of {questions.length}
            </p>
            <p
              id={`porosity-${question.id}-prompt`}
              className="mb-md font-headline-md text-body-lg text-on-surface"
            >
              {question.prompt}
            </p>
            <div className="space-y-sm">
              {question.answers.map((option) => {
                const selected = answers[question.id] === option.score
                return (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => answer(question.id, option.score)}
                    className={`flex w-full items-center gap-sm rounded-xl px-md py-3 text-left font-body-md text-body-md transition-colors active:scale-[0.98] ${
                      selected
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container text-on-surface'
                    }`}
                  >
                    <Icon
                      name={selected ? 'check_circle' : 'radio_button_unchecked'}
                      filled={selected}
                      className="shrink-0"
                    />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      {complete ? (
        <section className={`mb-2xl rounded-2xl p-xl ${result.theme}`}>
          <div className="mb-md flex items-center gap-sm">
            <Icon name={result.icon} className="text-3xl" />
            <h2 className="font-headline-lg text-headline-md">{result.label}</h2>
          </div>
          <p className="mb-lg font-body-lg text-body-md">{result.summary}</p>

          <h3 className="mb-sm font-label-md text-label-md uppercase tracking-widest">
            What to do about it
          </h3>
          <ul className="space-y-sm">
            {result.advice.map((tip) => (
              <li key={tip} className="flex items-start gap-sm font-body-md text-body-md">
                {/* leading-6 matches body-md's line height, so the tick sits on
                    the first line of a tip that wraps rather than above it. */}
                <Icon name="check" className="shrink-0 text-[18px] leading-6" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          <p className="mt-lg flex items-start gap-sm font-caption text-caption">
            {/* This line wraps on a phone; centring floated the icon between
                the two lines. Top-aligned, on the caption's own line box. */}
            <Icon name="check_circle" filled className="shrink-0 text-[16px] leading-4" />
            Saved to your hair profile — every recommendation now accounts for it.
          </p>

          <div className="mt-lg flex flex-wrap gap-sm">
            <Link
              to="/profile"
              className="rounded-full bg-current px-lg py-2 font-label-md text-label-md transition-all active:scale-95"
            >
              <span className="mix-blend-normal text-surface-container-lowest">
                View your profile
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setAnswers({})}
              className="rounded-full border border-current px-lg py-2 font-label-md text-label-md transition-all active:scale-95"
            >
              Start over
            </button>
          </div>
        </section>
      ) : (
        <p className="mb-2xl text-center font-body-md text-body-md text-on-surface-variant">
          Answer all {questions.length} questions to see your result.
        </p>
      )}

      <p className="mb-2xl text-center font-caption text-caption text-outline">
        This is a self-assessment, not a lab test. Treat the result as a starting point and
        adjust based on how your hair actually behaves.
      </p>
    </>
  )
}
