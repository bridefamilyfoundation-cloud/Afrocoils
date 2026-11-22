import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'
import SectionCrumb from '../components/SectionCrumb'
import ScreenFallback from '../components/ScreenFallback'
import {
  CoilPatternArt,
  ConditionArt,
  DensityArt,
  DiyArtwork,
  HairTypeArt,
  PorosityArt,
  ScalpArt,
  ThicknessArt,
} from '../components/HairIllustrations'
import { hairCheckFor } from '../content/hair-check'
import { todayKey } from '../lib/calendar'
import { useHairProfile } from '../lib/profile-store'
import {
  POROSITY_MAX_SCORE,
  POROSITY_SUMMARY,
  porosityFor,
  porosityQuestionsFor,
} from '../lib/porosity'
import {
  DISCOVERY_TOPICS,
  quizStepsFor,
  type DiyTest,
  type QuizChoice,
  type QuizStep,
} from '../lib/quiz'
import { resolveLocStage } from '../lib/locs'
import {
  CURL_PATTERNS,
  SCALP_CONCERNS,
  curlPatternLabel,
  hairConcernsFor,
} from '../lib/types'
import type {
  CurlPattern,
  Density,
  HairConcern,
  HairCondition,
  HairIdentity,
  HairState,
  HairTexture,
  HairType,
  PorosityLevel,
  ScalpCondition,
  ScalpConcern,
} from '../lib/types'

/**
 * Hair Discovery: the guided hair-profile assessment, one section per screen.
 *
 * Three phases: an opening screen ("Let's Get to Know Your Hair!") with
 * a way to skip straight to the profile, the steps, and a summary where
 * every answer can be reviewed and edited.
 *
 * Answers are written to the profile as they are given, not batched to
 * the end. Someone who abandons Discovery at question four keeps the
 * four answers they gave: a half-finished profile is worth strictly more
 * than none, and holding the results hostage to completion would throw
 * away the most useful ones, since they are asked first. So the summary
 * edits the profile directly: there is no draft to lose, and its last
 * button says so rather than pretending to save.
 *
 * The step list itself is derived from the answer to question one, so
 * answering "Locs" rewrites the rest of Discovery underneath the user.
 *
 * `?step=<id>` asks that one section alone and returns to the profile
 * with its row in view. Since 2026-11-18 that is how every hair answer
 * on the profile is changed: the profile shows the answers and Hair
 * Discovery is the one place that asks.
 *
 * Type 4 comes first: the coil pattern is step one, then loose or loc'd.
 *
 * Every result is worded as a closest match ("likely", "suggested"),
 * because that is what a self-assessment can honestly give.
 */

/* ------------------------------------------------------------------ *
 * Pictures
 * ------------------------------------------------------------------ */

function artFor(stepId: string, value: string): ReactNode {
  switch (stepId) {
    case 'hairType':
      return <HairTypeArt type={value as HairType} />
    case 'curlPattern':
      return <CoilPatternArt pattern={value as CurlPattern} />
    case 'density':
      return <DensityArt density={value as Density} />
    case 'texture':
      return <ThicknessArt texture={value as HairTexture} />
    case 'scalpCondition':
      return <ScalpArt condition={value as ScalpCondition} />
    case 'hairCondition':
      return <ConditionArt condition={value as HairCondition} />
    case 'porosity':
      return <PorosityArt level={value as PorosityLevel} />
    default:
      return null
  }
}

/**
 * Which Quick Hair Check entry covers a concern. A concern with no entry
 * (split ends) simply has no link; the summary never invents one.
 */
const HAIR_CHECK_FOR: Partial<Record<HairConcern | `scalp:${ScalpConcern}`, string>> = {
  Breakage: 'hair-breaking',
  Dryness: 'hair-dry',
  Tangling: 'hair-tangling',
  Shedding: 'hair-falling-out',
  'Length retention': 'hair-not-retaining',
  'scalp:Itching': 'scalp-itchy',
  'scalp:Dryness': 'scalp-dry',
  'scalp:Oiliness': 'scalp-oily',
  'scalp:Flaking': 'scalp-flaky',
  'scalp:Tenderness': 'scalp-sensitive',
}

/* ------------------------------------------------------------------ *
 * Screen
 * ------------------------------------------------------------------ */

type Phase = 'intro' | 'step' | 'summary'

export default function QuizScreen() {
  const { profile, update, ready, completeness } = useHairProfile()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const { identity, state } = profile
  const steps = useMemo(() => quizStepsFor(identity.hairType), [identity.hairType])
  const only = params.get('step')
  const single = only ? steps.find((s) => s.id === only) : undefined

  /*
   * Where you are, kept in the address (`?at=<step id>` or `?at=summary`)
   * rather than in component state. The summary links out to Hair
   * Problem and to the styles list; as state, coming back from either
   * showed the intro again, with the summary reachable only by stepping
   * through every question a second time.
   */
  const at = params.get('at')
  const found = at ? steps.findIndex((s) => s.id === at) : -1
  const phase: Phase = at === 'summary' ? 'summary' : found >= 0 ? 'step' : 'intro'
  const index = Math.max(0, found)
  const go = (to: number | 'summary' | 'intro') =>
    setParams(
      to === 'intro' ? {} : { at: to === 'summary' ? 'summary' : (steps[to]?.id ?? 'summary') },
      { replace: true },
    )
  // Opened from the summary's Edit: Continue goes back there, not onward.
  const [editing, setEditing] = useState(false)

  // A new screen's worth of content: start it at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [phase, index])

  // Clamped rather than trusted: answering "Locs" lengthens the step list
  // and switching back shortens it, and the index survives both.
  const step: QuizStep | undefined = single ?? steps[Math.min(index, steps.length - 1)]
  const current = single ? 'step' : phase

  function setIdentity(patch: Partial<HairIdentity>) {
    update({ identity: { ...identity, ...patch } })
  }

  function setState(patch: Partial<HairState>) {
    update({ state: { ...state, ...patch } })
  }

  // One answer advances after a short beat; a second tap inside that
  // beat must not advance twice and skip the next question unseen.
  const advancing = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(advancing.current), [])

  function next() {
    if (single) {
      /*
       * Back to whoever asked. One question is opened from the profile,
       * from Hair Care's trait cards, from a lesson and from the
       * recommendations list; it used to finish on the profile whichever
       * it was. With no history behind it (the address was opened
       * directly) the profile row is still the sensible place to land.
       */
      const depth = (window.history.state as { idx?: number } | null)?.idx ?? 0
      if (depth > 0) navigate(-1)
      else navigate(`/profile?open=${single.id}`, { replace: true })
    } else if (editing) {
      setEditing(false)
      go('summary')
    } else if (index >= steps.length - 1) go('summary')
    else go(index + 1)
  }

  function back() {
    if (single) navigate(-1)
    else if (editing) {
      setEditing(false)
      go('summary')
    } else if (index === 0) go('intro')
    else go(index - 1)
  }

  function edit(id: string) {
    const target = steps.findIndex((s) => s.id === id)
    if (target < 0) return
    setEditing(true)
    go(target)
  }

  if (!ready) return <ScreenFallback />

  if (current === 'intro') {
    return (
      <Intro
        returning={completeness > 0}
        onStart={() => go(0)}
      />
    )
  }

  if (current === 'summary') return <Summary onEdit={edit} />

  if (!step) return null

  const locs = identity.hairType === 'Locs'
  const position = steps.indexOf(step)

  function chooseSingle(value: string) {
    if (!step?.field) return
    setIdentity({ [step.field]: value })
    // A beat before advancing, so the selection is visible rather than the
    // screen simply changing under the tap.
    window.clearTimeout(advancing.current)
    advancing.current = window.setTimeout(next, 220)
  }

  const answered = (() => {
    switch (step.kind) {
      case 'condition':
        return state.condition !== undefined || (state.concerns?.length ?? 0) > 0
      case 'scalp':
        return identity.scalpCondition !== undefined || (identity.scalpConcerns?.length ?? 0) > 0
      default:
        return step.field ? identity[step.field] !== undefined : false
    }
  })()

  return (
    <>
      <SectionCrumb to="/profile" label="My Hair Profile" />

      {!single && (
        <ProgressBar current={position + 1} total={steps.length} label={step.topic} />
      )}

      <section className="mb-lg">
        <p className="mb-xs font-caption text-caption uppercase tracking-widest text-outline">
          {single ? step.topic : `${step.topic} · ${position + 1} of ${steps.length}`}
        </p>
        <h2 className="mb-sm font-headline-lg text-headline-md text-on-background">{step.title}</h2>
        {step.help && !step.diy && (
          <p className="font-body-md text-body-md text-on-surface-variant">{step.help}</p>
        )}
      </section>

      {step.diy && (
        <>
          <Understand step={step} />
          <TryAtHome diy={step.diy} locs={locs} />
        </>
      )}

      {step.kind === 'choice' && (
        <section className="mb-xl space-y-sm" aria-label="Choose the closest match">
          {step.choices?.map((choice) => (
            <ChoiceCard
              key={choice.value}
              stepId={step.id}
              choice={choice}
              locs={locs}
              selected={step.field ? identity[step.field] === choice.value : false}
              onClick={() => chooseSingle(choice.value)}
            />
          ))}
          {step.diy && step.field && (
            <NotSure
              onClick={() => {
                setIdentity({ [step.field!]: undefined })
                next()
              }}
            />
          )}
        </section>
      )}

      {step.kind === 'coils' && <CoilsStep step={step} onUnsure={next} setIdentity={setIdentity} />}

      {step.kind === 'porosity' && (
        <PorosityStep
          onUnsure={() => {
            update({ identity: { ...identity, porosity: undefined }, porosityTest: undefined })
            next()
          }}
        />
      )}

      {step.kind === 'scalp' && (
        <section className="mb-xl">
          <div className="mb-lg space-y-sm">
            {step.choices?.map((choice) => (
              <ChoiceCard
                key={choice.value}
                stepId={step.id}
                choice={choice}
                locs={locs}
                selected={identity.scalpCondition === choice.value}
                onClick={() =>
                  setIdentity({
                    scalpCondition:
                      identity.scalpCondition === choice.value
                        ? undefined
                        : (choice.value as ScalpCondition),
                  })
                }
              />
            ))}
            <NotSure
              onClick={() => {
                setIdentity({ scalpCondition: undefined, scalpConcerns: undefined })
                next()
              }}
            />
          </div>
          <ConcernChips
            title="Do you notice any of these? Pick all that apply."
            options={SCALP_CONCERNS}
            value={identity.scalpConcerns ?? []}
            onChange={(list) =>
              setIdentity({ scalpConcerns: list.length > 0 ? (list as ScalpConcern[]) : undefined })
            }
          />
          <p className="mt-md font-caption text-caption text-on-surface-variant">
            A scalp that is sore, bleeding, has bumps that will not settle or patches with no
            hair needs a dermatologist, not a product.
          </p>
        </section>
      )}

      {step.kind === 'condition' && (
        <section className="mb-xl">
          <div className="mb-lg space-y-sm">
            {step.choices?.map((choice) => (
              <ChoiceCard
                key={choice.value}
                stepId={step.id}
                choice={choice}
                locs={locs}
                selected={state.condition === choice.value}
                onClick={() =>
                  setState({
                    condition:
                      state.condition === choice.value ? undefined : (choice.value as HairCondition),
                  })
                }
              />
            ))}
            <NotSure
              onClick={() => {
                setState({ condition: undefined, concerns: undefined })
                next()
              }}
            />
          </div>
          <ConcernChips
            title="What are you dealing with? Pick all that apply."
            options={hairConcernsFor(identity.hairType)}
            value={state.concerns ?? []}
            onChange={(list) =>
              setState({ concerns: list.length > 0 ? (list as HairConcern[]) : undefined })
            }
          />
        </section>
      )}

      {step.kind === 'date' && step.field && (
        <section className="mb-xl rounded-2xl bg-surface-container-lowest p-lg shadow-card">
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
            onChange={(e) => setIdentity({ [step.field!]: e.target.value || undefined })}
            className="w-full rounded-xl bg-surface-container px-md py-3 font-body-md text-body-md text-on-surface"
          />
          {locs && identity.locStartISO && (
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

      {/* Back and skip, not Next, on one-answer steps: they advance on
          tap, so a Next button would sit there doing nothing most of the
          time. Every other step gets its own Continue. */}
      <section className="mb-xl flex items-center justify-between gap-md">
        <button
          type="button"
          onClick={back}
          className="flex items-center gap-xs rounded-full px-lg py-2 font-label-md text-label-md text-on-surface-variant active:scale-95"
        >
          <Icon name="chevron_left" className="text-[18px]" />
          {editing ? 'Summary' : 'Back'}
        </button>

        {/* A step that cannot be skipped still needs a way on once it
            has an answer: someone re-running Discovery to change a later
            question would otherwise have to re-tap the same card. */}
        {step.kind === 'choice' ? (
          (step.optional || answered) && (
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
            className="rounded-full bg-secondary px-xl py-3 font-label-md text-label-md font-bold text-on-secondary active:scale-95"
          >
            {answered ? 'Continue' : 'Skip this one'}
          </button>
        )}
      </section>

      <p className="mb-2xl text-center font-caption text-caption text-outline">
        This is a guided self-assessment, not a diagnosis. Pick the closest match, then adjust
        it as you learn how your hair behaves.
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Opening screen
 * ------------------------------------------------------------------ */

const TOPIC_ART: Record<(typeof DISCOVERY_TOPICS)[number], ReactNode> = {
  'Coil pattern': <CoilPatternArt pattern="4B" />,
  Porosity: <PorosityArt level="Medium" />,
  Density: <DensityArt density="Medium" />,
  'Strand thickness': <ThicknessArt texture="Medium" />,
  Scalp: <ScalpArt condition="Balanced" />,
  'Hair condition': <ConditionArt condition="Healthy" />,
}

function Intro({ returning, onStart }: { returning: boolean; onStart: () => void }) {
  return (
    <>
      <SectionCrumb to="/profile" label="My Hair Profile" />
      <ScreenHeader
        title="Let’s Get to Know Your Hair!"
        subtitle="Explore, learn and discover your unique Type 4 hair: 4A, 4B or 4C. For each part of your hair you will see what it means, then try a simple test at home to find out yours."
      />

      <section aria-label="What Hair Discovery covers" className="mb-xl">
        <ul className="grid grid-cols-3 gap-sm">
          {DISCOVERY_TOPICS.map((topic) => (
            <li key={topic} className="rounded-2xl bg-surface-container-lowest p-xs shadow-card">
              <div className="overflow-hidden rounded-xl">{TOPIC_ART[topic]}</div>
              <p className="px-xs py-xs text-center font-label-md text-caption text-on-surface">
                {topic}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mb-xl font-body-md text-body-md text-on-surface-variant">
        Each section has two parts. <strong>Understand your hair</strong> explains it with
        pictures. <strong>Try it at home</strong> is a gentle test with things you already
        have, like a spray bottle, a mirror and a sewing thread. Then you pick what you saw.
        What you find fills in your Hair Profile, and the guides, styles and products you see
        are fitted to it.
        {returning && ' Your current answers are already filled in, so you only change what is different.'}
      </p>

      <button
        type="button"
        onClick={onStart}
        className="mb-md flex w-full items-center justify-center gap-sm rounded-full bg-secondary px-lg py-4 font-label-md text-body-md font-bold text-on-secondary transition-all active:scale-95"
      >
        <Icon name="auto_awesome" className="text-[20px]" />
        Start Hair Discovery
      </button>
      <Link
        to="/profile"
        className="mb-xl flex w-full items-center justify-center gap-sm rounded-full bg-surface-container-lowest px-lg py-3 font-label-md text-label-md text-on-surface shadow-card transition-all active:scale-95"
      >
        See what your profile already holds
      </Link>

      <p className="mb-2xl text-center font-caption text-caption text-outline">
        About five minutes. Skip anything you are unsure of. Your answers stay on this phone,
        and every result is a guided best match, not a diagnosis.
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function ProgressBar({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div
      className="mb-lg h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Hair Discovery progress: ${label}`}
    >
      <div
        className="h-full rounded-full bg-secondary transition-all duration-300"
        style={{ width: `${(current / total) * 100}%` }}
      />
    </div>
  )
}

/** "1 · Understand your hair", "2 · Try it at home". */
function PartHeading({ n, title }: { n: number; title: string }) {
  return (
    <h3 className="mb-md flex items-center gap-sm font-headline-md text-body-lg font-bold text-on-surface">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-inverse-surface font-label-md text-label-md text-inverse-on-surface"
      >
        {n}
      </span>
      {title}
    </h3>
  )
}

/**
 * Part 1: what the trait is, and every possible result drawn and named,
 * so the user knows what they are looking for before they look.
 */
function Understand({ step }: { step: QuizStep }) {
  const examples = (step.choices ?? []).filter((c) => c.name)
  return (
    <section className="mb-xl" aria-label="Understand your hair">
      <PartHeading n={1} title="Understand your hair" />
      {step.help && (
        <p className="mb-md font-body-md text-body-md text-on-surface-variant">{step.help}</p>
      )}
      {examples.length > 0 && (
        <ul className={`grid gap-sm ${examples.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {examples.map((c) => (
            <li key={c.value} className="rounded-2xl bg-surface-container-lowest p-xs shadow-card">
              <div className="overflow-hidden rounded-xl">{artFor(step.id, c.value)}</div>
              <p className="px-xs pt-xs text-center font-label-md text-caption font-bold text-on-surface">
                {c.name}
              </p>
              <p className="px-xs pb-xs text-center font-caption text-[11px] leading-tight text-on-surface-variant">
                {c.caption}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Part 2: the DIY test. What it tests, what you need, illustrated steps,
 * any caveat, and then the question the answers underneath it answer.
 */
function TryAtHome({ diy, locs }: { diy: DiyTest; locs: boolean }) {
  return (
    <section aria-label="Try it at home" className="mb-lg">
      <PartHeading n={2} title="Try it at home" />
      <div className="mb-lg rounded-2xl bg-surface-container-lowest p-lg shadow-card">
        <p className="font-caption text-caption uppercase tracking-widest text-outline">DIY test</p>
        <p className="mb-xs font-headline-md text-body-lg font-bold text-on-surface">{diy.name}</p>
        <p className="mb-md font-body-md text-caption text-on-surface-variant">
          <span className="font-bold text-on-surface">What you are testing: </span>
          {diy.testing}
        </p>

        <p className="mb-xs font-label-md text-label-md text-on-surface">You will need</p>
        <ul className="mb-lg flex flex-wrap gap-xs">
          {diy.materials.map((m) => (
            <li
              key={m}
              className="rounded-full bg-surface-container px-md py-1 font-label-md text-caption text-on-surface"
            >
              {m}
            </li>
          ))}
        </ul>

        <ol className="space-y-md">
          {diy.steps.map((s, i) => (
            <li key={s.text} className="flex items-start gap-md">
              <span className="w-24 shrink-0 overflow-hidden rounded-xl">
                <DiyArtwork art={s.art} />
              </span>
              <span className="min-w-0 flex-1 font-body-md text-caption text-on-surface">
                <span className="mb-xs block font-label-md text-label-md font-bold">Step {i + 1}</span>
                {locs && s.textLocs ? s.textLocs : s.text}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-lg flex items-start gap-sm rounded-xl bg-surface-container p-md font-body-md text-caption text-on-surface-variant">
          <Icon name="shield" className="shrink-0 text-[18px] text-primary" />
          Be gentle: no pulling, raking or heat. If anything hurts, stop.
        </p>
      </div>

      {diy.note && (
        <div className="mb-lg flex items-start gap-md rounded-2xl bg-tertiary-fixed p-lg text-on-tertiary-fixed">
          {diy.note.art && (
            <span className="w-20 shrink-0 overflow-hidden rounded-xl">
              <DiyArtwork art={diy.note.art} />
            </span>
          )}
          <div>
            <p className="mb-xs font-label-md text-label-md font-bold">{diy.note.title}</p>
            <p className="font-body-md text-caption">{diy.note.body}</p>
          </div>
        </div>
      )}

      <h3 className="font-headline-md text-body-lg font-bold text-on-surface">What did you see?</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{diy.question}</p>
    </section>
  )
}

/** Always available on a DIY step: leaving an answer blank beats guessing it. */
function NotSure({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-md rounded-2xl bg-surface-container-lowest p-md text-left text-on-surface shadow-card transition-all active:scale-[0.98]"
    >
      <Icon name="info" className="shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block font-headline-md text-body-md font-bold">I’m not sure</span>
        <span className="mt-xs block font-body-md text-caption text-on-surface-variant">
          That is fine. Leave it blank and try the test again another day.
        </span>
      </span>
    </button>
  )
}

/** One answer with its picture. Selected is espresso, as everywhere. */
function ChoiceCard({
  stepId,
  choice,
  locs,
  selected,
  onClick,
}: {
  stepId: string
  choice: QuizChoice
  locs: boolean
  selected: boolean
  onClick: () => void
}) {
  const art = artFor(stepId, choice.value)
  const detail = locs && choice.detailLocs ? choice.detailLocs : choice.detail
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-md rounded-2xl p-md text-left transition-all active:scale-[0.98] ${
        selected
          ? 'bg-inverse-surface text-inverse-on-surface'
          : 'bg-surface-container-lowest text-on-surface shadow-card'
      }`}
    >
      {art && <span className="w-24 shrink-0 overflow-hidden rounded-xl">{art}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-headline-md text-body-md font-bold">{choice.label}</span>
        {detail && <span className="mt-xs block font-body-md text-caption opacity-80">{detail}</span>}
      </span>
      <Icon
        name={selected ? 'check_circle' : 'radio_button_unchecked'}
        filled={selected}
        className="shrink-0"
      />
    </button>
  )
}

/** Several at once: white chips that turn espresso. */
function ConcernChips({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: readonly string[]
  value: readonly string[]
  onChange: (next: string[]) => void
}) {
  function toggle(option: string) {
    const on = value.includes(option)
    // Kept in vocabulary order, so the summary reads the same every time.
    onChange(options.filter((o) => (o === option ? !on : value.includes(o))))
  }
  return (
    <div role="group" aria-label={title}>
      <p className="mb-sm font-label-md text-label-md text-on-surface">{title}</p>
      <div className="flex flex-wrap gap-sm">
        {options.map((option) => {
          const on = value.includes(option)
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(option)}
              className={`flex items-center gap-xs rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                on
                  ? 'bg-inverse-surface text-inverse-on-surface'
                  : 'bg-surface-container-lowest text-on-surface shadow-card'
              }`}
            >
              {on && <Icon name="check" className="text-[16px]" />}
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Coil pattern: every pattern on the head, then the one that covers
 * most of it. `curlPattern` is that one and the only one the app reads;
 * `curlPatterns` keeps the mix for the profile to show.
 */
function CoilsStep({
  step,
  onUnsure,
  setIdentity,
}: {
  step: QuizStep
  onUnsure: () => void
  setIdentity: (patch: Partial<HairIdentity>) => void
}) {
  const { profile } = useHairProfile()
  const { identity } = profile
  const locs = identity.hairType === 'Locs'
  const selected: CurlPattern[] =
    identity.curlPatterns ?? (identity.curlPattern ? [identity.curlPattern] : [])

  function write(list: CurlPattern[], primary?: CurlPattern) {
    const main = primary ?? (identity.curlPattern && list.includes(identity.curlPattern) ? identity.curlPattern : list[0])
    setIdentity({ curlPattern: main, curlPatterns: list.length > 1 ? list : undefined })
  }

  function toggle(pattern: CurlPattern) {
    const on = selected.includes(pattern)
    write(CURL_PATTERNS.filter((p) => (p === pattern ? !on : selected.includes(p))))
  }

  return (
    <section className="mb-xl">
      <div className="mb-sm space-y-sm">
        {step.choices?.map((choice) => (
          <ChoiceCard
            key={choice.value}
            stepId={step.id}
            choice={choice}
            locs={locs}
            selected={selected.includes(choice.value as CurlPattern)}
            onClick={() => toggle(choice.value as CurlPattern)}
          />
        ))}
        <NotSure
          onClick={() => {
            setIdentity({ curlPattern: undefined, curlPatterns: undefined })
            onUnsure()
          }}
        />
      </div>

      {selected.length > 1 && (
        <div className="mt-lg rounded-2xl bg-surface-container-lowest p-lg shadow-card">
          <p className="mb-xs font-label-md text-label-md text-on-surface">
            Which one covers most of your head?
          </p>
          <p className="mb-md font-caption text-caption text-on-surface-variant">
            The app fits its advice to this one, and keeps the others on your profile.
          </p>
          <div className="flex flex-wrap gap-sm">
            {selected.map((pattern) => {
              const main = identity.curlPattern === pattern
              return (
                <button
                  key={pattern}
                  type="button"
                  aria-pressed={main}
                  onClick={() => write(selected, pattern)}
                  className={`rounded-full px-lg py-2 font-label-md text-label-md transition-colors active:scale-95 ${
                    main
                      ? 'bg-inverse-surface text-inverse-on-surface'
                      : 'bg-surface-container-lowest text-on-surface shadow-card'
                  }`}
                >
                  {curlPatternLabel(pattern)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Porosity: the three cuticles, then the five scored questions, then the
 * suggested level. The result is written once every question is answered
 * and rewritten if an answer changes, like the standalone test.
 */
function PorosityStep({ onUnsure }: { onUnsure: () => void }) {
  const { profile, update } = useHairProfile()
  const { identity } = profile
  const questions = porosityQuestionsFor(identity.hairType)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const done = Object.keys(answers).length === questions.length
  const total = Object.values(answers).reduce((a, b) => a + b, 0)
  const level = done ? porosityFor(total) : undefined

  function answer(id: string, score: number) {
    const next = { ...answers, [id]: score }
    setAnswers(next)
    if (Object.keys(next).length === questions.length) {
      const sum = Object.values(next).reduce((a, b) => a + b, 0)
      update({
        identity: { ...identity, porosity: porosityFor(sum) },
        porosityTest: { score: sum, max: POROSITY_MAX_SCORE, takenISO: new Date().toISOString() },
      })
    }
  }

  return (
    <section className="mb-xl">
      {identity.porosity && !done && (
        <p className="mb-md font-caption text-caption text-on-surface-variant">
          On your profile now:{' '}
          <span className="text-on-surface">{identity.porosity.toLowerCase()} porosity</span>.
          Answer again to update it, or continue to keep it.
        </p>
      )}

      <div className="space-y-md">
        {questions.map((question, i) => (
          // A group rather than a fieldset, for the reason spelled out in
          // PorosityScreen: a legend paints into the border box, which put
          // the counter outside the card and out of line with the question.
          <div
            key={question.id}
            role="group"
            aria-labelledby={`quiz-porosity-${question.id}-prompt`}
            className="rounded-2xl bg-surface-container-lowest p-lg shadow-card"
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

      {level && (
        <div className="mt-lg flex items-start gap-md rounded-2xl bg-inverse-surface p-lg text-inverse-on-surface" aria-live="polite">
          <span className="w-20 shrink-0 overflow-hidden rounded-xl">
            <PorosityArt level={level} />
          </span>
          <div>
            <p className="font-caption text-caption uppercase tracking-widest opacity-80">
              Your likely porosity
            </p>
            <p className="mb-xs font-headline-md text-body-lg font-bold">{level} porosity</p>
            <p className="font-body-md text-caption opacity-90">{POROSITY_SUMMARY[level]}</p>
          </div>
        </div>
      )}

      {!done && (
        <div className="mt-md">
          <NotSure onClick={onUnsure} />
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

function Summary({ onEdit }: { onEdit: (id: string) => void }) {
  const { profile } = useHairProfile()
  const navigate = useNavigate()
  const { identity, state } = profile
  const locs = identity.hairType === 'Locs'
  const steps = quizStepsFor(identity.hairType)

  function describe(step: QuizStep): string | undefined {
    switch (step.id) {
      case 'hairType':
        return identity.hairType
      case 'curlPattern': {
        if (!identity.curlPattern) return undefined
        const others = (identity.curlPatterns ?? []).filter((p) => p !== identity.curlPattern)
        return others.length > 0
          ? `Mostly ${identity.curlPattern}, with some ${others.join(' and ')}`
          : identity.curlPattern
      }
      case 'porosity':
        return identity.porosity && `${identity.porosity} (suggested)`
      case 'locStartISO':
        return (
          identity.locStartISO &&
          `${identity.locStartISO.slice(0, 10)} · ${resolveLocStage(identity).stage ?? 'Starter'} stage (estimated)`
        )
      case 'scalpCondition':
        return joinAnswer(identity.scalpCondition, identity.scalpConcerns)
      case 'hairCondition':
        return joinAnswer(state.condition, state.concerns)
      default:
        return step.field ? (identity[step.field] as string | undefined) : undefined
    }
  }

  // Concerns the Quick Hair Check has a written entry for, for this hair type.
  const available = new Map(
    hairCheckFor(identity.hairType).flatMap((group) =>
      group.concerns.map((c) => [c.id, `${group.heading} ${c.label}`] as const),
    ),
  )
  const related = [
    ...(state.concerns ?? []).map((c) => HAIR_CHECK_FOR[c]),
    ...(identity.scalpConcerns ?? []).map((c) => HAIR_CHECK_FOR[`scalp:${c}`]),
  ]
    .filter((id): id is string => id !== undefined && available.has(id))
    .map((id) => ({ id, label: available.get(id)! }))

  return (
    <>
      <SectionCrumb to="/profile" label="My Hair Profile" />
      <ScreenHeader
        title="Your Hair Discovery"
        subtitle="Here is what you found. Check it, and change anything that does not look right."
      />

      <section
        aria-label="Your answers"
        className="mb-xl divide-y divide-outline-variant/30 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card"
      >
        {steps.map((step) => {
          const value = describe(step)
          return (
            <div key={step.id} className="flex items-center gap-md px-lg py-md">
              <div className="min-w-0 flex-1">
                <p className="font-caption text-caption text-on-surface-variant">{step.topic}</p>
                <p
                  className={`font-label-md text-label-md ${value ? 'text-on-surface' : 'text-outline'}`}
                >
                  {value ?? 'Not answered'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(step.id)}
                aria-label={`${value ? 'Edit' : 'Add'} ${step.topic.toLowerCase()}`}
                className="flex shrink-0 items-center gap-xs rounded-full bg-surface-container px-md py-1.5 font-label-md text-label-md text-on-surface active:scale-95"
              >
                <Icon name={value ? 'edit' : 'add'} className="text-[16px]" />
                {value ? 'Edit' : 'Add'}
              </button>
            </div>
          )
        })}
      </section>

      <section className="mb-xl rounded-2xl bg-tertiary-fixed p-lg text-on-tertiary-fixed">
        <p className="mb-xs flex items-center gap-sm font-label-md text-label-md font-bold">
          <Icon name="info" className="text-[18px]" />
          Guided results, not a diagnosis
        </p>
        <p className="font-body-md text-caption">
          These are your closest matches from what you could see and feel. Hair changes with
          seasons, styles and care{locs ? ', and locs change as they mature' : ''}, so come back
          whenever yours seems different. Sudden shedding, bald patches or a painful scalp are
          for a dermatologist to look at.
        </p>
      </section>

      {related.length > 0 && (
        <section className="mb-xl">
          <h3 className="mb-sm px-xs font-label-md text-label-md font-bold text-on-surface">
            What to do about what you noticed
          </h3>
          <ul className="space-y-sm">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/sos/problem?open=${item.id}`}
                  className="flex items-center gap-md rounded-2xl bg-surface-container-lowest p-md shadow-card transition-all active:scale-[0.98]"
                >
                  <Icon name="spa" className="shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 font-body-md text-body-md text-on-surface">
                    {item.label}
                  </span>
                  <Icon name="chevron_right" className="shrink-0 text-outline" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-2xl space-y-sm">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex w-full items-center justify-center gap-sm rounded-full bg-secondary px-lg py-4 font-label-md text-body-md font-bold text-on-secondary transition-all active:scale-95"
        >
          <Icon name="check_circle" filled className="text-[20px]" />
          Save My Hair Profile
        </button>
        <p className="text-center font-caption text-caption text-on-surface-variant">
          Your answers are kept on this phone. Use Edit beside any of them to change it first.
        </p>
        <Link
          to="/styles/recommended"
          className="flex w-full items-center justify-center gap-sm rounded-full bg-surface-container-lowest px-lg py-3 font-label-md text-label-md text-on-surface shadow-card transition-all active:scale-95"
        >
          See styles for your hair
          <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      </section>
    </>
  )
}

/** "Dry · Itching, Flaking", or either half alone. */
function joinAnswer(overall: string | undefined, concerns: readonly string[] | undefined) {
  const list = concerns && concerns.length > 0 ? concerns.join(', ') : undefined
  if (overall && list) return `${overall} · ${list}`
  return overall ?? list
}
