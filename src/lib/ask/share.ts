import { shareQuestion } from '../api'
import { MAX_ASK_QUESTION_CHARS } from '../types'
import { askOutcome, type AskReply } from './engine'

/**
 * Send a question Ask has just answered to the review queue, if the
 * person has sharing on.
 *
 * Called once per question asked, from the sheet and from `/ask` — not
 * from re-renders, and not when back or forward replays a question
 * already asked. What travels is `AskQuestionRequest` and nothing more:
 * the words, what Ask did with them, and the update number. The study
 * script (`npm run ask:study`) reads the queue to find what Ask could
 * not answer, which is where the next answers come from.
 */
export function shareAsked(question: string, reply: AskReply, enabled: boolean): void {
  if (!enabled) return
  const text = question.trim().slice(0, MAX_ASK_QUESTION_CHARS)
  if (!text) return
  shareQuestion({
    question: text,
    ...askOutcome(reply),
    bundle: __BUNDLE_CODE__ > 0 ? __BUNDLE_CODE__ : undefined,
  })
}
