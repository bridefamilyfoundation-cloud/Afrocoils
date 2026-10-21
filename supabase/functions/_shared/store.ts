/**
 * Where a community submission goes once the route has accepted it.
 *
 * Postgres, through PostgREST: the queue gets an index and an ordering,
 * and the client id gets a `unique` constraint, which is what makes a
 * retry idempotent rather than a duplicate in the moderation queue. The
 * photographs go to Supabase Storage in the same project, in a private
 * bucket — see `supabase.ts` for why that is not a detail.
 *
 * Supabase is the only store. The Redis and in-memory fallbacks went
 * when the route moved into an Edge Function: the platform injects the
 * project's URL and service key, so there is no deployment of this
 * function that lacks a durable store, and a fallback nobody can reach is
 * one more thing to keep correct.
 */

import {
  PHOTO_BUCKET,
  insert,
  removeObjects,
  select,
  supabaseConfig,
  supabaseConfigured,
  uploadObject,
} from './supabase.ts'

export interface StoredSubmission {
  id: string
  clientId: string
  receivedISO: string
  review: 'Pending' | 'Approved' | 'Rejected'
  /** The submitted fields, already validated. Photos are references. */
  body: Record<string, unknown>
  /** Keys into the photo store, in the order they were submitted. */
  photoKeys: string[]
}

/** The row shape, which is snake_case because Postgres is. */
interface SubmissionRow {
  id: string
  client_id: string
  received_at: string
  review: StoredSubmission['review']
  body: Record<string, unknown>
  photo_keys: string[]
}

function fromRow(row: SubmissionRow): StoredSubmission {
  return {
    id: row.id,
    clientId: row.client_id,
    receivedISO: new Date(row.received_at).toISOString(),
    review: row.review,
    body: row.body,
    photoKeys: row.photo_keys ?? [],
  }
}

function config() {
  const c = supabaseConfig()
  if (!c) throw new Error('SUPABASE_URL or the service key is missing from the function environment.')
  return c
}

/**
 * Whether a submission written now would survive. Always true inside a
 * deployed function; kept as a check so the route still refuses with a
 * 503, leaving the device's copy `Queued`, if the environment is ever
 * missing a value.
 */
export function storeIsDurable(): boolean {
  return supabaseConfigured()
}

export async function putSubmission(submission: StoredSubmission): Promise<void> {
  await insert(config(), 'submissions', [
    {
      id: submission.id,
      client_id: submission.clientId,
      received_at: submission.receivedISO,
      review: submission.review,
      body: submission.body,
      photo_keys: submission.photoKeys,
    },
  ])
}

/**
 * The submission already recorded for this device-side id, if any.
 *
 * The device keeps its copy `Queued` and retries until a 200, so a
 * response lost on the way back means the same contribution arrives a
 * second time. Looking the client id up before doing any work lets the
 * route recognise that and hand back the original id, instead of
 * writing a duplicate and a second set of photographs.
 */
export async function findSubmissionByClientId(clientId: string): Promise<StoredSubmission | null> {
  const rows = await select<SubmissionRow>(
    config(),
    'submissions',
    `client_id=eq.${encodeURIComponent(clientId)}&limit=1`,
  )
  return rows[0] ? fromRow(rows[0]) : null
}

/* ------------------------------------------------------------------ *
 * Photographs
 * ------------------------------------------------------------------ */

export function photoStoreConfigured(): boolean {
  return supabaseConfigured()
}

/**
 * The object path for one photograph of one submission.
 *
 * Grouped under the submission id so a record and its bytes can be found
 * from either end. The index keeps submitted order visible in the bucket;
 * the random suffix means a retry cannot collide with the objects a
 * previous attempt wrote.
 */
export function photoPath(submissionId: string, index: number): string {
  const suffix = crypto.randomUUID().slice(0, 8)
  return `${submissionId}/${String(index).padStart(2, '0')}-${suffix}.jpg`
}

/** Put one photograph in the private bucket, returning the path it reads back by. */
export function putPhoto(bytes: Uint8Array, contentType: string, path: string): Promise<string> {
  return uploadObject(config(), path, bytes, contentType)
}

/**
 * Delete photographs already uploaded for a submission that then failed
 * to record. Best-effort and swallowed by the caller: what it prevents is
 * bytes accumulating in the bucket with no row pointing at them.
 */
export async function removePhotos(paths: string[]): Promise<void> {
  const c = supabaseConfig()
  if (!c || paths.length === 0) return
  await removeObjects(c, paths)
}

/** The bucket photographs are in, for anything that reports on config. */
export { PHOTO_BUCKET }
