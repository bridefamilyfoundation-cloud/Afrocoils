/**
 * Where a community submission goes once the route has accepted it.
 *
 * Three implementations behind one interface, picked from the
 * environment: **Supabase** in production, Redis where an older
 * deployment still has Upstash/Vercel KV set, and an in-memory one for
 * `npm run dev`. Supabase wins when both are configured.
 *
 * Supabase is what closed this file's two open questions at once. It had
 * said a submission store "is NOT a database" — true of Redis, where a
 * record was a JSON blob under a key and the pending queue was a list
 * pushed to. Postgres gives the queue an index and an ordering for free,
 * and gives the client id a `unique` constraint, which is what makes a
 * retry idempotent rather than a duplicate in the moderation queue.
 *
 * It also filled the photo seam. Redis was the wrong place for four
 * megabytes of JPEG and the file said so; Supabase Storage is a blob
 * store in the same project as the records, so `putPhoto` is no longer a
 * seam pointing at a service nobody had provisioned. It is private —
 * see `api/_supabase.ts` for why that is not a detail.
 *
 * No SDK in any of them: PostgREST and the Storage API are plain HTTP,
 * the same call this file already made against Upstash.
 */

import {
  PHOTO_BUCKET,
  insert,
  removeObjects,
  select,
  supabaseConfig,
  supabaseConfigured,
  uploadObject,
  type SupabaseConfig,
} from './_supabase'

export interface StoredSubmission {
  id: string
  clientId: string
  receivedISO: string
  review: 'Pending' | 'Approved' | 'Rejected'
  /** The submitted fields, already validated. Photos are references. */
  body: Record<string, unknown>
  /** Keys into the photo store, in the order they were submitted. */
  photoKeys: string[]
  /** Set by a reviewer. Never written by the submit route. */
  reviewedISO?: string
  reviewerNote?: string
}

interface Store {
  readonly kind: 'supabase' | 'redis' | 'memory'
  put(submission: StoredSubmission): Promise<void>
  get(id: string): Promise<StoredSubmission | null>
  /** Ids only, newest first. The reviewer fetches bodies one at a time. */
  listPending(limit: number): Promise<string[]>
  /**
   * The submission already recorded for this device-side id, if any.
   *
   * The device keeps its copy `Queued` and retries until a 200, so a
   * response lost on the way back means the same contribution arrives a
   * second time. Looking the client id up before doing any work lets the
   * route recognise that and hand back the original id, instead of
   * writing a duplicate for a reviewer to notice by eye and a second set
   * of photographs to sit in the bucket behind it.
   */
  findByClientId(clientId: string): Promise<StoredSubmission | null>
}

function redisConfig(): { url: string; token: string } | null {
  // Both namings accepted, exactly as `_limits.ts` does — the variables
  // differ depending on whether the integration was added as Vercel KV
  // or as Upstash directly, and it should not become a support question.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/$/, ''), token } : null
}

/** One pipelined call, so a write is a single round trip. */
async function pipeline(
  config: { url: string; token: string },
  commands: (string | number)[][],
): Promise<unknown[]> {
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands.map((c) => c.map(String))),
  })
  if (!response.ok) throw new Error(`Submission store returned ${response.status}`)
  const results = (await response.json()) as { result?: unknown }[]
  return results.map((r) => r?.result)
}

/* ------------------------------------------------------------------ *
 * Supabase
 * ------------------------------------------------------------------ */

/** The row shape, which is snake_case because Postgres is. */
interface SubmissionRow {
  id: string
  client_id: string
  received_at: string
  review: StoredSubmission['review']
  body: Record<string, unknown>
  photo_keys: string[]
  reviewed_at: string | null
  reviewer_note: string | null
}

function fromRow(row: SubmissionRow): StoredSubmission {
  return {
    id: row.id,
    clientId: row.client_id,
    receivedISO: new Date(row.received_at).toISOString(),
    review: row.review,
    body: row.body,
    photoKeys: row.photo_keys ?? [],
    reviewedISO: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : undefined,
    reviewerNote: row.reviewer_note ?? undefined,
  }
}

function supabaseStore(config: SupabaseConfig): Store {
  return {
    kind: 'supabase',
    async put(submission) {
      await insert(config, 'submissions', [
        {
          id: submission.id,
          client_id: submission.clientId,
          received_at: submission.receivedISO,
          review: submission.review,
          body: submission.body,
          photo_keys: submission.photoKeys,
        },
      ])
    },
    async get(id) {
      const rows = await select<SubmissionRow>(
        config,
        'submissions',
        `id=eq.${encodeURIComponent(id)}&limit=1`,
      )
      return rows[0] ? fromRow(rows[0]) : null
    },
    async listPending(limit) {
      /*
       * Oldest first, unlike the Redis implementation below.
       *
       * Redis got newest-first for free from LPUSH, which is the wrong
       * order for a queue somebody has to work through: the bottom is
       * never reached. The partial index in the migration matches this
       * exactly (`where review = 'Pending'` ordered by `received_at`),
       * so it is an index scan rather than a sort.
       */
      const rows = await select<{ id: string }>(
        config,
        'submissions',
        `select=id&review=eq.Pending&order=received_at.asc&limit=${limit}`,
      )
      return rows.map((r) => r.id)
    },
    async findByClientId(clientId) {
      const rows = await select<SubmissionRow>(
        config,
        'submissions',
        `client_id=eq.${encodeURIComponent(clientId)}&limit=1`,
      )
      return rows[0] ? fromRow(rows[0]) : null
    },
  }
}

function redisStore(config: { url: string; token: string }): Store {
  return {
    kind: 'redis',
    async put(submission) {
      await pipeline(config, [
        ['SET', `sub:${submission.id}`, JSON.stringify(submission)],
        // A list rather than a sorted set: submissions arrive in time
        // order already, so LPUSH puts newest first for free and the
        // reviewer reads from the head.
        ['LPUSH', 'sub:pending', submission.id],
        // The client-id index. Postgres gets this from a unique
        // constraint; Redis has no secondary index, so the pointer is
        // written by hand and `findByClientId` reads it.
        ['SET', `sub:client:${submission.clientId}`, submission.id],
      ])
    },
    async get(id) {
      const [raw] = await pipeline(config, [['GET', `sub:${id}`]])
      if (typeof raw !== 'string') return null
      return JSON.parse(raw) as StoredSubmission
    },
    async listPending(limit) {
      const [ids] = await pipeline(config, [['LRANGE', 'sub:pending', 0, limit - 1]])
      return Array.isArray(ids) ? (ids as string[]) : []
    },
    async findByClientId(clientId) {
      const [id] = await pipeline(config, [['GET', `sub:client:${clientId}`]])
      if (typeof id !== 'string') return null
      return this.get(id)
    },
  }
}

/**
 * Per-instance fallback, and honest about it.
 *
 * A serverless instance is recycled without warning, so a submission
 * written here is lost the moment that happens. That is fine for `npm
 * run dev` and unacceptable in production, which is why `storeIsDurable`
 * exists and why the route refuses to accept a submission it cannot
 * durably keep — losing somebody's ten minutes of typing silently is
 * exactly the failure this whole feature was built to avoid.
 */
const submissions = new Map<string, StoredSubmission>()

const memoryStore: Store = {
  kind: 'memory',
  async put(submission) {
    submissions.set(submission.id, submission)
  },
  async get(id) {
    return submissions.get(id) ?? null
  },
  async listPending(limit) {
    return [...submissions.values()]
      .filter((s) => s.review === 'Pending')
      .sort((a, b) => a.receivedISO.localeCompare(b.receivedISO))
      .slice(0, limit)
      .map((s) => s.id)
  },
  async findByClientId(clientId) {
    return [...submissions.values()].find((s) => s.clientId === clientId) ?? null
  },
}

let store: Store | undefined

function getStore(): Store {
  if (!store) {
    // Supabase first where it is configured: it is the one that also
    // holds the photographs, so a deployment with both set should not
    // end up with records in Redis pointing at objects in Supabase.
    const supabase = supabaseConfig()
    if (supabase) {
      store = supabaseStore(supabase)
    } else {
      const config = redisConfig()
      store = config ? redisStore(config) : memoryStore
    }
    if (store.kind === 'memory') {
      console.warn(
        '[api/store] No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY set — submissions are kept in this instance only and will be lost when it recycles.',
      )
    }
  }
  return store
}

/** Whether a submission written now would survive this instance. */
export function storeIsDurable(): boolean {
  return getStore().kind !== 'memory'
}

export function putSubmission(submission: StoredSubmission): Promise<void> {
  return getStore().put(submission)
}

export function getSubmission(id: string): Promise<StoredSubmission | null> {
  return getStore().get(id)
}

export function listPendingSubmissions(limit = 50): Promise<string[]> {
  return getStore().listPending(limit)
}

/** The record already held for a device-side submission id, if any. */
export function findSubmissionByClientId(clientId: string): Promise<StoredSubmission | null> {
  return getStore().findByClientId(clientId)
}

/* ------------------------------------------------------------------ *
 * Photographs
 *
 * Supabase Storage, in the same project as the records above. This was
 * the one piece the backend was missing: a seam that threw rather than
 * stubbing a silent success, because a photo store that pretends is how
 * a contributor's four images become four broken references nobody
 * notices for a month.
 *
 * The bucket is **private**. A reviewer reads through a signed URL with
 * an expiry — see `signedPhotoUrl` in `_supabase.ts`. These are
 * photographs of people's hair waiting to be read, including ones that
 * will be rejected, and a public bucket makes every one of them a
 * permanent shareable link from the moment it is written.
 * ------------------------------------------------------------------ */

export function photoStoreConfigured(): boolean {
  return supabaseConfigured()
}

/**
 * The object path for one photograph of one submission.
 *
 * Grouped under the submission id so a record and its bytes can be found
 * from either end — the deletion path below sweeps the whole prefix
 * rather than tracking four paths separately. The index keeps submitted
 * order visible in the bucket; the random suffix means a retry cannot
 * collide with the objects a previous attempt wrote.
 */
export function photoPath(submissionId: string, index: number): string {
  const suffix = crypto.randomUUID().slice(0, 8)
  return `${submissionId}/${String(index).padStart(2, '0')}-${suffix}.jpg`
}

/**
 * Put one photograph in the bucket, returning the path it reads back by.
 *
 * Throws when Supabase is not configured, which the route turns into a
 * 503 before it has written anything — so a submission is either stored
 * whole, photographs and all, or refused with the device's copy left
 * safely `Queued`. There is no state in between.
 */
export async function putPhoto(
  bytes: Buffer,
  contentType: string,
  path: string,
): Promise<string> {
  const config = supabaseConfig()
  if (!config) {
    throw new Error(
      'No photo store configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — see docs/community-backend.md.',
    )
  }
  return uploadObject(config, path, bytes, contentType)
}

/**
 * Delete photographs already uploaded for a submission that then failed
 * to record.
 *
 * Best-effort and deliberately swallowed by the caller: the submission
 * is being refused either way, and a failure to tidy up must not turn a
 * recoverable 502 into something the contributor sees differently. What
 * it prevents is bytes accumulating in the bucket with no row pointing
 * at them — the server-side version of the orphaned-photo rule the
 * device already follows.
 */
export async function removePhotos(paths: string[]): Promise<void> {
  const config = supabaseConfig()
  if (!config || paths.length === 0) return
  await removeObjects(config, paths)
}

/** The bucket photographs are in, for anything that reports on config. */
export { PHOTO_BUCKET }
