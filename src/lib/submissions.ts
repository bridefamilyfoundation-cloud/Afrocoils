import { ApiError, submitStyle } from './api'
import { readPhotoBase64 } from './photos'
import type { StyleSubmission, SubmissionRequest } from './types'

/**
 * Sending a queued submission to the community library.
 *
 * The queue is the feature and the send is the optimisation. A
 * contribution is written to the profile the moment the contributor taps
 * submit, and stays there until a server confirms it has a durable copy
 * — so this module's only job is to try, and to be unambiguous about
 * whether it worked. It never deletes, never rewrites the local row, and
 * never reports success it cannot prove.
 *
 * Lives apart from `api.ts` because it does the translation `api.ts`
 * deliberately does not: a `StyleSubmission` carries photo *filenames*,
 * and the wire needs bytes. Reading four JPEGs off disk is not something
 * a thin fetch wrapper should be doing.
 */

export class SubmissionError extends Error {
  /**
   * True when the server said "not yet" rather than "no".
   *
   * The distinction is the whole point of showing a message at all: a
   * 503 from a library that has not opened is not the contributor's
   * problem and not something retrying in a minute will fix, whereas a
   * dropped connection is.
   */
  readonly notOpenYet: boolean

  constructor(message: string, notOpenYet = false) {
    super(message)
    this.notOpenYet = notOpenYet
  }
}

/**
 * Build the wire shape from the stored one.
 *
 * Photos that cannot be read are a hard failure rather than a silent
 * omission. A contributor who sent four and finds three in the library
 * has no way to know which was lost, and the back of the head — the one
 * angle they cannot see on themselves and the reason the app asks for
 * more than one — is exactly the one worth losing least.
 */
async function toRequest(submission: StyleSubmission): Promise<SubmissionRequest> {
  const photosBase64: string[] = []
  for (const path of submission.photos) {
    const base64 = await readPhotoBase64(path)
    if (!base64) {
      throw new SubmissionError(
        'One of the photographs could not be read from this device, so nothing was sent.',
      )
    }
    photosBase64.push(base64)
  }

  return {
    name: submission.name,
    category: submission.category,
    hairType: submission.hairType,
    minutes: submission.minutes,
    difficulty: submission.difficulty,
    note: submission.note,
    occasions: submission.occasions,
    needs: submission.needs,
    steps: submission.steps,
    photosBase64,
    credit: submission.credit,
    rightsConfirmed: submission.rightsConfirmed,
    clientId: submission.id,
  }
}

/**
 * Try to send one submission.
 *
 * Returns the row to store. On success that is the same submission with
 * `status: 'Sent'` — the transition CLAUDE.md describes, and the only
 * field that changes. On any failure it throws and the caller leaves the
 * existing row exactly as it was.
 */
export async function sendSubmission(submission: StyleSubmission): Promise<StyleSubmission> {
  if (submission.status === 'Sent') return submission

  try {
    await submitStyle(await toRequest(submission))
    return { ...submission, status: 'Sent' }
  } catch (error) {
    if (error instanceof SubmissionError) throw error
    if (error instanceof ApiError) {
      // The route's 503 text is the one message worth passing through
      // verbatim: it is the server telling the contributor the library
      // is not open, which no wording invented here could improve on.
      throw new SubmissionError(error.message, /not accepting submissions yet/i.test(error.message))
    }
    throw new SubmissionError(
      'Could not reach the community library. Your submission is still saved on this device.',
    )
  }
}
