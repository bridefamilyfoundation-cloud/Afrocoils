import type { SubmissionRequest, SubmissionResponse } from '../../../src/lib/types.ts'
import {
  HAIR_TYPES,
  MAX_PHOTOS_PER_SUBMISSION,
  MAX_SUBMISSION_PHOTO_BYTES,
  OCCASIONS,
  STYLE_CATEGORIES,
  STYLE_DIFFICULTIES,
} from '../../../src/lib/types.ts'
import { checkLimits, limitResponse } from '../_shared/limits.ts'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { serve } from '../_shared/env.ts'
import {
  findSubmissionByClientId,
  photoPath,
  photoStoreConfigured,
  putPhoto,
  putSubmission,
  removePhotos,
  storeIsDurable,
} from '../_shared/store.ts'

/**
 * Receiving a style offered to the community library.
 *
 * The library is contributed content and nothing else, so this is the
 * only way anything new gets into it. It runs as a Supabase Edge
 * Function (`npm run backend:deploy`), deployed with JWT verification
 * off because the app holds no Supabase key of any kind. Two things to
 * know about it:
 *
 * - **It spends storage, not tokens.** There is no model call, so the
 *   limits here are about abuse and disk rather than a daily bill.
 * - **Nothing it accepts is published.** Every submission lands as
 *   `Pending` for a human to read. A moderation queue that auto-publishes
 *   is not a moderation queue, and this one is holding a rights claim
 *   that the library has already been burnt by once.
 *
 * The device keeps its own copy either way. A submission is written to
 * the profile as `Queued` *before* this is called and only becomes
 * `Sent` on a 200, so a refusal here costs the contributor nothing —
 * which is the whole reason the queue exists rather than a fire-and-hope
 * POST from the submit button.
 */

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

/** One photograph, decoded and checked it came from the app's camera path. */
function decodePhoto(value: unknown): Uint8Array | null {
  if (typeof value !== 'string' || value.length === 0) return null

  // A `data:` prefix is a common client-side slip and cheap to forgive.
  const raw = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value
  if (!BASE64.test(raw)) return null
  // Refused before decoding, so an oversized string is never allocated
  // twice. Base64 is four characters for every three bytes.
  if (Math.floor((raw.length * 3) / 4) > MAX_SUBMISSION_PHOTO_BYTES + 2) return null

  let bytes: Uint8Array
  try {
    bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
  } catch {
    return null
  }

  if (bytes.length === 0 || bytes.length > MAX_SUBMISSION_PHOTO_BYTES) return null
  // JPEG SOI marker: `capturePhoto()` always writes JPEG, so anything
  // else did not come through the app.
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return null

  return bytes
}

interface ValidSubmission {
  body: Omit<SubmissionRequest, 'photosBase64'>
  photos: Uint8Array[]
}

/**
 * Validate the whole submission against the same const arrays the
 * pickers are built from.
 *
 * This is a public endpoint and the client's claim about what it sent is
 * not evidence. Free text — name, note, credit, steps, kit — is length-
 * capped rather than vocabulary-checked, because it cannot be anything
 * else, and trimmed to keep a wall of whitespace out of the store.
 */
function validate(body: unknown): ValidSubmission | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>

  const inList = <T extends readonly string[]>(list: T, v: unknown): T[number] | undefined =>
    typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T[number]) : undefined

  const text = (v: unknown, max: number): string | undefined => {
    if (typeof v !== 'string') return undefined
    const trimmed = v.trim()
    return trimmed.length > 0 && trimmed.length <= max ? trimmed : undefined
  }

  const lines = (v: unknown, max: number): string[] =>
    Array.isArray(v)
      ? v.map((l) => text(l, 500)).filter((l): l is string => l !== undefined).slice(0, max)
      : []

  const name = text(b.name, 80)
  const category = inList(STYLE_CATEGORIES, b.category)
  const hairType = inList(HAIR_TYPES, b.hairType)
  const clientId = text(b.clientId, 100)
  if (!name || !hairType || !clientId) return null

  // The same bar the submit screen holds the contributor to, restated
  // here because the screen is not what is being trusted: something a
  // reviewer can read. The form asks for a description; submissions
  // queued by older versions carry steps instead, and still qualify.
  const note = text(b.note, 1000)
  const steps = lines(b.steps, 40)
  if (!note && steps.length < 2) return null

  // Not a formality and not defaulted. An unclaimed submission is
  // refused outright rather than stored for someone to chase.
  if (b.rightsConfirmed !== true) return null

  const rawPhotos = Array.isArray(b.photosBase64) ? b.photosBase64 : []
  if (rawPhotos.length > MAX_PHOTOS_PER_SUBMISSION) return null
  const photos: Uint8Array[] = []
  for (const each of rawPhotos) {
    const decoded = decodePhoto(each)
    // One bad photo fails the submission rather than being dropped
    // quietly: a contributor who sent four and sees three published has
    // no way to tell which was lost or why.
    if (!decoded) return null
    photos.push(decoded)
  }

  const minutes = typeof b.minutes === 'number' && b.minutes > 0 && b.minutes <= 600
    ? Math.round(b.minutes)
    : undefined

  const occasions = Array.isArray(b.occasions)
    ? [...new Set(b.occasions.map((o) => inList(OCCASIONS, o)))].filter(
        (o): o is (typeof OCCASIONS)[number] => o !== undefined,
      )
    : []

  return {
    body: {
      name,
      category,
      hairType,
      minutes,
      difficulty: inList(STYLE_DIFFICULTIES, b.difficulty),
      note,
      occasions,
      needs: lines(b.needs, 20),
      steps,
      credit: text(b.credit, 60),
      rightsConfirmed: true,
      clientId,
    },
    photos,
  }
}

function OPTIONS(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin') ?? undefined),
  })
}

async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') ?? undefined

  const limit = await checkLimits(req, 'submissions')
  if (!limit.allowed) return limitResponse(limit, origin)

  /*
   * Refuse before reading the body, not after.
   *
   * Accepting a submission this instance cannot durably keep would hand
   * the device a 200, flip its copy to `Sent`, and lose the whole thing
   * when the instance recycles — with the contributor believing it
   * arrived and no longer able to retry. A 503 leaves their copy
   * `Queued` and retryable, which is the honest failure.
   */
  if (!storeIsDurable() || !photoStoreConfigured()) {
    console.error(
      `[submissions] refusing: durable store ${storeIsDurable()}, photo store ${photoStoreConfigured()}`,
    )
    return jsonResponse(
      {
        error:
          'The community library is not accepting submissions yet. Yours is saved on your device and can be sent when it opens.',
      },
      503,
      origin,
    )
  }

  const input = validate(await req.json().catch(() => null))
  if (!input) {
    return jsonResponse({ error: 'Invalid submission' }, 400, origin)
  }

  const { clientId } = input.body

  /*
   * The same submission, arriving again.
   *
   * The device keeps its copy `Queued` and retries until it sees a 200,
   * so a response lost on the way back — a dropped connection after the
   * write, a timeout at the edge — means this contribution arrives a
   * second time. Answering with the original id makes that retry
   * idempotent: the contributor's copy flips to `Sent` and stops, the
   * moderation queue holds one row rather than two for a reviewer to
   * spot by eye, and a second set of photographs never reaches the
   * bucket.
   *
   * Checked before anything is written, which is the only place it is
   * worth checking. `client_id` is `unique` in the schema, so the write
   * below would fail on a duplicate anyway — but it would fail *after*
   * four photographs had been uploaded and orphaned.
   */
  try {
    const existing = await findSubmissionByClientId(clientId)
    if (existing) {
      console.log(`[submissions] ${existing.id} already held for client ${clientId}`)
      return jsonResponse(
        { id: existing.id, clientId, review: existing.review } satisfies SubmissionResponse,
        200,
        origin,
      )
    }
  } catch (error) {
    // The lookup failing is not grounds to refuse — at worst a duplicate
    // reaches the queue, which a reviewer can merge. Refusing a genuine
    // first submission because the check was unavailable is the worse
    // trade.
    console.error('[submissions] client-id lookup failed, continuing', error)
  }

  const id = `sub_${crypto.randomUUID()}`
  const photoKeys: string[] = []

  try {
    // Photographs first. A record pointing at bytes that failed to land
    // is worse than no record: it looks complete to a reviewer and is
    // not. Same ordering rule the device uses when deleting.
    //
    // They go under the submission's own id, so the record and its bytes
    // can be found from either end and the cleanup below is one prefix.
    for (const [index, bytes] of input.photos.entries()) {
      photoKeys.push(await putPhoto(bytes, 'image/jpeg', photoPath(id, index)))
    }

    await putSubmission({
      id,
      clientId,
      receivedISO: new Date().toISOString(),
      review: 'Pending',
      body: { ...input.body },
      photoKeys,
    })

    console.log(`[submissions] stored ${id} (${photoKeys.length} photos)`)

    return jsonResponse(
      { id, clientId, review: 'Pending' } satisfies SubmissionResponse,
      201,
      origin,
    )
  } catch (error) {
    console.error('[submissions]', error)

    /*
     * Take the photographs back out.
     *
     * The record is what makes them findable, so bytes uploaded for a
     * submission that then failed to record are unreachable from
     * anywhere — the server-side version of the orphan rule the device
     * already follows. Best-effort: the response below is the same
     * either way, and the contributor's copy is still `Queued`.
     */
    await removePhotos(photoKeys).catch((cleanupError) => {
      console.error(`[submissions] could not clean up photos for ${id}`, cleanupError)
    })

    return jsonResponse(
      {
        error:
          'Could not save that submission. It is still on your device — try again in a moment.',
      },
      502,
      origin,
    )
  }
}

serve((req) => {
  if (req.method === 'OPTIONS') return OPTIONS(req)
  if (req.method === 'POST') return POST(req)
  return jsonResponse({ error: 'Method not allowed' }, 405, req.headers.get('origin') ?? undefined)
})
