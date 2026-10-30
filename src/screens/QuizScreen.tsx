import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'
import SectionCrumb from '../components/SectionCrumb'
import ScreenFallback from '../components/ScreenFallback'
import { todayKey } from '../lib/calendar'
import { useHairProfile } from '../lib/profile-store'
import { POROSITY_MAX_SCORE, porosityFor, porosityQuestionsFor } from '../lib/porosity'
import { quizStepsFor, type QuizStep } from '../lib/quiz'
import { resolveLocStage } from '../lib/locs'
import { curlPatternLabel } from '../lib/types'
import type { HairIdentity, HairType } from '../lib/types'

/**
 * The hair-profile quiz — one question per screen.
 *
 * Answers are written to the profile as they are given, not batched to
 * the end. Someone who abandons the quiz at question four keeps the four
 * answers they gave: a half-finished profile is worth strictly more than
 * none, and holding the results hostage to completion would throw away
 * the most useful ones, since they are asked first.
 *
 * The step list itself is derived from the answer to question one, so
 * answering "Locs" rewrites the rest of the quiz underneath the user.
 */

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="mb-xl h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label="Quiz progress"
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${(current / total) * 100}%` }}
      />
    </div>
  )
}

/** The five-question porosity sub-test, inlined as one quiz step. */
function PorosityStep({
  hairType,
  onScored,
}: {
  hairType: HairType | undefined
  onScored: (score: number) => void
}) {
  const questions = porosityQuestionsFor(hairType)
  const [answers, setAnswers] = useState<Record<string, number>>({})

  function answer(id: string, score: number) {
    const next = { ...answers, [id]: score }
    setAnswers(next)
    if (Object.keys(next).length === questions.length) {
      onScored(Object.values(next).reduce((a, b) => a + b, 0))
    }
  }

  return (
    <div className="space-y-md">
      {questions.map((question, i) => (
        // A group rather than a fieldset, for the reason spelled out in
        // PorosityScreen: a legend paints into the border box, which put the
        // counter outside the card and out of line with the question.
        <div
          key={question.id}
          role="group"
          aria-labelledby={`quiz-porosity-${question.id}-prompt`}
          className="rounded-2xl shadow-card bg-surface-container-lowest p-lg"
        >
          <p className="mb-xs font-caption text-caption uppercase tracking-widest text-outline">
            {i + 1} of {questions.length}
          </p>
          <p
            id={`quiz-porosity-${question.id}-prompt`}
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
                      ? 'bg-inverse-surface text-inverse-on-surface'
                      : 'bg-surface-container-lowest text-on-surface shadow-card'
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
    </div>
  )
}

export default function QuizScreen() {
  const { profile, update, ready, completeness } = useHairProfile()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)

  const { identity } = profile
  const steps = useMemo(() => quizStepsFor(identity.hairType), [identity.hairType])

  // Clamped rather than trusted: answering "Locs" lengthens the step list
  // and switching back shortens it, and the index survives both.
  const step: QuizStep | undefined = steps[Math.min(index, steps.length - 1)]

  function setField(field: keyof HairIdentity, value: string | undefined) {
    update({ identity: { ...identity, [field]: value } })
  }

  function next() {
    if (index >= steps.length - 1) setDone(true)
    else setIndex((i) => i + 1)
  }

  function choose(field: keyof HairIdentity, value: string) {
    setField(field, value)
    // A beat before advancing, so the selection is visible rather than the
    // screen simply changing under the tap.
    window.setTimeout(next, 180)
  }

  if (!ready) return <ScreenFallback />

  if (done) return <QuizResult />

  if (!step) return null

  const answered = identity[step.field] !== undefined

  return (
    <>
      <SectionCrumb to="/profile" label="My Hair Profile" />
      <ScreenHeader
        title="Hair quiz"
        subtitle="Answer what you can. Everything here is skippable except the first question."
      />

      <ProgressBar current={index + 1} total={steps.length} />

      <section className="mb-xl">
        <p className="mb-xs font-caption text-caption uppercase tracking-widest text-outline">
          Question {index + 1} of {steps.length}
        </p>
        <h2 className="mb-sm font-headline-lg text-headline-md text-on-background">
          {step.title}
        </h2>
        {step.help && (
          <p className="font-body-md text-body-md text-on-surface-variant">{step.help}</p>
        )}
      </section>

      {step.kind === 'choice' && (
        <section className="mb-2xl space-y-sm">
          {step.choices?.map((choice) => {
            const selected = identity[step.field] === choice.value
            return (
              <button
                key={choice.value}
                type="button"
                aria-pressed={selected}
                onClick={() => choose(step.field, choice.value)}
                className={`flex w-full items-start gap-md rounded-2xl border p-lg text-left transition-all active:scale-[0.98] ${
                  selected
                    ? 'border-transparent bg-secondary-container text-on-secondary-container'
                    : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface'
                }`}
              >
                <Icon
                  name={selected ? 'check_circle' : 'radio_button_unchecked'}
                  filled={selected}
                  className="mt-0.5 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-headline-md text-body-lg">{choice.label}</span>
                  {choice.detail && (
                    <span className="mt-xs block font-body-md text-caption opacity-80">
                      {choice.detail}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </section>
      )}

      {step.kind === 'porosity' && (
        <section className="mb-2xl">
          <PorosityStep
            hairType={identity.hairType}
            onScored={(score) => {
              update({
                identity: { ...identity, porosity: porosityFor(score) },
                porosityTest: {
                  score,
                  max: POROSITY_MAX_SCORE,
                  takenISO: new Date().toISOString(),
                },
              })
              window.setTimeout(next, 400)
            }}
          />
        </section>
      )}

      {step.kind === 'date' && (
        <section className="mb-2xl rounded-2xl shadow-card bg-surface-container-lowest p-lg">
          <label
            htmlFor="quiz-date"
            className="mb-sm block font-label-md text-label-md text-on-surface"
          >
            Start date
          </label>
          {/* `max` is local today via `todayKey`, not
              `toISOString().slice(0, 10)` — that is the UTC day, which
              east of Greenwich is yesterday for the first hours of the
              morning and capped the picker below the date the user is
              actually living in. */}
          <input
            id="quiz-date"
            type="date"
            max={todayKey()}
            value={(identity[step.field] as string | undefined)?.slice(0, 10) ?? ''}
            onChange={(e) => setField(step.field, e.target.value || undefined)}
            className="w-full rounded-xl bg-surface-container px-md py-3 font-body-md text-body-md text-on-surface"
          />
          {identity.hairType === 'Locs' && identity.locStartISO && (
            <p className="mt-md flex items-center gap-sm font-caption text-caption text-on-surface-variant">
              <Icon name="auto_awesome" className="text-[16px] text-primary" />
              That puts you at the{' '}
              <span className="text-on-surface">
                {resolveLocStage(identity).stage?.toLowerCase() ?? 'starter'}
              </span>{' '}
              stage. You can correct it on your profile.
            </p>
          )}
        </section>
      )}

      {/* Back and skip, not Next: choice steps advance themselves on tap,
          so a Next button would sit there doing nothing most of the time.
          The porosity and date steps get their own Continue below. */}
      <section className="mb-2xl flex items-center justify-between gap-md">
        <button
          type="button"
          onClick={() => (index === 0 ? navigate(-1) : setIndex((i) => i - 1))}
          className="flex items-center gap-xs rounded-full px-lg py-2 font-label-md text-label-md text-on-surface-variant active:scale-95"
        >
          <Icon name="chevron_left" className="text-[18px]" />
          Back
        </button>

        {step.kind === 'choice' ? (
          step.optional && (
            <button
              type="button"
              onClick={next}
              className="rounded-full px-lg py-2 font-label-md text-label-md text-primary underline active:scale-95"
            >
              {answered ? 'Next' : 'Skip this one'}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-primary px-xl py-3 font-label-md text-label-md text-on-primary active:scale-95"
          >
            {answered ? 'Continue' : 'Skip this one'}
          </button>
        )}
      </section>

      <p className="mb-2xl text-center font-caption text-caption text-outline">
        This is a self-assessment, not a lab test. Treat the results as a starting point and
        adjust as you learn how your hair actually behaves.
        {completeness > 0 && ` Your profile is ${Math.round(completeness * 100)}% complete.`}
      </p>
    </>
  )
}

/** The end of the quiz: what it learned, and where that changes things. */
function QuizResult() {
  const { profile, completeness } = useHairProfile()
  const { identity } = profile
  const isLocs = identity.hairType === 'Locs'

  const learned = [
    identity.hairType && { label: 'Hair type', value: identity.hairType },
    identity.curlPattern && {
      label: 'Coil pattern',
      value: curlPatternLabel(identity.curlPattern),
    },
    identity.porosity && { label: 'Porosity', value: `${identity.porosity} porosity` },
    identity.density && { label: 'Density', value: `${identity.density} density` },
    identity.texture && { label: 'Hair texture', value: identity.texture },
    identity.scalpCondition && { label: 'Scalp', value: identity.scalpCondition },
    isLocs && identity.locType && { label: 'Loc size', value: identity.locType },
    isLocs && identity.locMethod && { label: 'Started with', value: identity.locMethod },
    isLocs &&
      identity.locStartISO && {
        label: 'Loc stage',
        value: `${resolveLocStage(identity).stage ?? 'Starter'} (estimated)`,
      },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <>
      <ScreenHeader title="That's your profile" subtitle="Here is what the app now knows." />

      <section className="mb-2xl rounded-2xl bg-secondary-container p-xl text-on-secondary-container">
        <div className="mb-md flex items-center gap-sm">
          <Icon name="check_circle" filled className="text-3xl" />
          <h2 className="font-headline-lg text-headline-md">
            {Math.round(completeness * 100)}% complete
          </h2>
        </div>
        <dl className="space-y-sm">
          {learned.map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-md">
              <dt className="font-body-md text-body-md opacity-80">{item.label}</dt>
              <dd className="text-right font-label-md text-label-md">{item.value}</dd>
            </div>
          ))}
        </dl>
        {learned.length === 0 && (
          <p className="font-body-md text-body-md">
            You skipped everything. Nothing was saved — run it again whenever you like.
          </p>
        )}
      </section>

      <section className="mb-2xl space-y-sm">
        <p className="mb-md font-body-md text-body-md text-on-surface-variant">
          This now shapes the whole app: which styles you are shown, which guides you are
          given, and how often the calendar thinks you should wash.
        </p>
        <Link
          to="/styles"
          className="flex items-center gap-md rounded-2xl bg-primary p-lg text-on-primary transition-all active:scale-[0.98]"
        >
          <Icon name="auto_awesome" className="shrink-0 text-2xl" />
          <span className="min-w-0 flex-1">
            <span className="block font-headline-md text-body-lg">See styles for your hair</span>
            <span className="font-body-md text-caption opacity-90">
              Re-ranked around what you just answered.
            </span>
          </span>
          <Icon name="arrow_forward" className="shrink-0" />
        </Link>
        <Link
          to="/profile"
          className="flex items-center gap-md rounded-2xl shadow-card bg-surface-container-lowest p-lg transition-all active:scale-[0.98]"
        >
          <Icon name="face_3" className="shrink-0 text-2xl text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-headline-md text-body-lg text-on-surface">
              Review or correct it
            </span>
            <span className="font-body-md text-caption text-on-surface-variant">
              Every answer is editable, and nothing here is locked in.
            </span>
          </span>
          <Icon name="arrow_forward" className="shrink-0 text-outline" />
        </Link>
      </section>
    </>
  )
}
