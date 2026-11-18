import type { PorosityLevel } from './types'

/**
 * The porosity self-assessment: questions and scoring.
 *
 * Lives here rather than inside PorosityScreen because two screens now
 * run it — the standalone test and the full hair quiz — and a second
 * copy of the question set would drift from the first. The result is
 * also the kind of derivation a user could reasonably dispute, and the
 * repo's rule is that those are readable on their own rather than buried
 * in a component.
 *
 * A scored questionnaire rather than the "float a strand in a glass of
 * water" test, which is unreliable: a clean strand's buoyancy depends
 * mostly on surface tension and product residue.
 */

export interface PorosityQuestion {
  id: string
  prompt: string
  answers: { label: string; score: number }[]
}

export const POROSITY_QUESTIONS: PorosityQuestion[] = [
  {
    id: 'wetting',
    prompt: 'When you wet your hair, how quickly does it get properly soaked?',
    answers: [
      { label: 'Water beads up — it takes a while', score: 0 },
      { label: 'Soaks in at a normal pace', score: 1 },
      { label: 'Instantly drenched', score: 2 },
    ],
  },
  {
    id: 'drying',
    prompt: 'How long does it take to air dry?',
    answers: [
      { label: 'Ages — still damp hours later', score: 0 },
      { label: 'A few hours', score: 1 },
      { label: 'Very fast', score: 2 },
    ],
  },
  {
    id: 'product',
    prompt: 'How does your hair respond to product?',
    answers: [
      { label: 'Sits on top, feels coated', score: 0 },
      { label: 'Absorbs reasonably well', score: 1 },
      { label: 'Drinks it up and still feels dry', score: 2 },
    ],
  },
  {
    id: 'feel',
    prompt: 'Run a finger up a strand towards the root. How does it feel?',
    answers: [
      { label: 'Smooth', score: 0 },
      { label: 'Slightly textured', score: 1 },
      { label: 'Bumpy or rough', score: 2 },
    ],
  },
  {
    id: 'history',
    prompt: 'Has your hair been colour-treated, relaxed, or heat-styled often?',
    answers: [
      { label: 'Never', score: 0 },
      { label: 'Occasionally', score: 1 },
      { label: 'Regularly', score: 2 },
    ],
  },
]

export const POROSITY_MAX_SCORE = POROSITY_QUESTIONS.length * 2

/**
 * One line per result, shown wherever a result is: the porosity test's
 * result card and Hair Discovery's. One wording, so the two agree.
 */
export const POROSITY_SUMMARY: Record<PorosityLevel, string> = {
  Low: 'Your cuticles lie flat and tight. Moisture struggles to get in — but once it is in, it stays.',
  Medium:
    'The easiest type to work with. Your cuticle takes moisture in readily and holds it a reasonable time.',
  High: 'Your cuticles are raised, so water goes in fast and leaves just as fast. The work is in sealing, not soaking.',
}

/** Score bands. Pure, so the mapping can be read and checked on its own. */
export function porosityFor(total: number): PorosityLevel {
  const ratio = total / POROSITY_MAX_SCORE
  if (ratio < 0.34) return 'Low'
  if (ratio < 0.67) return 'Medium'
  return 'High'
}

/**
 * The loc variant of the last question.
 *
 * Locs are not colour-treated or heat-styled in the way loose hair is,
 * and asking a loc wearer about blow-drying reads as an app that has not
 * noticed what is on their head. The rest of the questions hold for both.
 */
export const LOC_HISTORY_QUESTION: PorosityQuestion = {
  id: 'history',
  prompt: 'Have your locs been colour-treated, or were they relaxed before you locked?',
  answers: [
    { label: 'Never', score: 0 },
    { label: 'Once, or a while ago', score: 1 },
    { label: 'Coloured or bleached regularly', score: 2 },
  ],
}

export function porosityQuestionsFor(hairType: string | undefined): PorosityQuestion[] {
  if (hairType !== 'Locs') return POROSITY_QUESTIONS
  return POROSITY_QUESTIONS.map((q) => (q.id === 'history' ? LOC_HISTORY_QUESTION : q))
}
