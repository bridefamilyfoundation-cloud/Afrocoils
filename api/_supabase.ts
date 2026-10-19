/**
 * The Supabase connection, for the one route that has a backend.
 *
 * Supabase is three things this folder needed and had to reach for
 * separately before: a durable record store (was Upstash/Vercel KV), a
 * blob store for the photographs (was an unimplemented Vercel Blob seam)
 * and somewhere to keep the rate-limit counters. One project now serves
 * all three, which is one set of credentials to provision and one
 * dashboard to look at a pending queue in.
 *
 * **No SDK.** `@supabase/supabase-js` is a dependency in every function
 * bundle to save what turns out to be about thirty lines of `fetch`, and
 * this folder already made that call once — `_limits.ts` and `_store.ts`
 * both talk to Upstash over its REST API for the same reason. PostgREST
 * and the Storage API are plain HTTP; the SDK's value is its realtime
 * and auth layers, neither of which this route has any use for.
 *
 * ## The key
 *
 * `SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security completely. It
 * is a server credential and nothing else:
 *
 * - It is read from `process.env`, which only exists in the serverless
 *   environment. Vite never sees it.
 * - It must never be given a `VITE_` prefix. Anything so prefixed is
 *   inlined into the bundle and ships inside the APK, where it can be
 *   read out of the package by anyone who downloads it.
 * - `assertKeyIsServerOnly()` below fails loudly if a `VITE_`-prefixed
 *   copy ever appears, because the failure mode otherwise is silent and
 *   total: a public key with RLS bypass is a public write to the whole
 *   database.
 *
 * The client never talks to Supabase at all. It talks to
 * `api/submissions.ts`, which is what keeps the validation, the rate
 * limits and the "nothing auto-publishes" rule in one place that the
 * device cannot route around.
 */

export interface SupabaseConfig {
  url: string
  serviceKey: string
}

/**
 * Guard against the service key ever being built into the client.
 *
 * Checked at config time rather than documented and hoped for. A
 * `VITE_SUPABASE_SERVICE_ROLE_KEY` in an env file is a plausible slip
 * — it is what someone reaches for when the client "cannot see" the
 * variable — and it is not recoverable once a release ships with it.
 */
function assertKeyIsServerOnly(): void {
  const leaked = Object.keys(process.env).filter(
    (key) => key.startsWith('VITE_') && /SUPABASE.*(KEY|SECRET|TOKEN)/i.test(key),
  )
  if (leaked.length > 0) {
    throw new Error(
      `${leaked.join(', ')} is VITE_-prefixed, which inlines it into the client bundle and ships it inside the APK. ` +
        'Supabase keys belong in the serverless environment only — rename it without the prefix.',
    )
  }
}

let cached: SupabaseConfig | null | undefined

export function supabaseConfig(): SupabaseConfig | null {
  if (cached !== undefined) return cached

  assertKeyIsServerOnly()

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  cached = url && serviceKey ? { url: url.replace(/\/$/, ''), serviceKey } : null
  return cached
}

export function supabaseConfigured(): boolean {
  return supabaseConfig() !== null
}

function authHeaders(config: SupabaseConfig): Record<string, string> {
  return {
    // PostgREST wants both: `apikey` identifies the project, the bearer
    // token is what it actually authorises against.
    apikey: config.serviceKey,
    Authorization: `Bearer ${config.serviceKey}`,
  }
}

async function failure(response: Response, what: string): Promise<Error> {
  // PostgREST puts a useful `message`/`hint` in the body; Storage returns
  // its own shape. Neither is guaranteed, so the status is the fallback.
  const body = await response.text().catch(() => '')
  const detail = body.slice(0, 400)
  return new Error(`${what} failed (${response.status})${detail ? `: ${detail}` : ''}`)
}

/* ------------------------------------------------------------------ *
 * PostgREST
 * ------------------------------------------------------------------ */

/**
 * Insert rows into a table.
 *
 * `Prefer: return=minimal` because nothing here reads the row back — the
 * route already holds everything it returns to the device, and asking
 * PostgREST to serialise the row costs a round trip's worth of body for
 * no reader.
 */
export async function insert(
  config: SupabaseConfig,
  table: string,
  rows: unknown[],
): Promise<void> {
  const response = await fetch(`${config.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      ...authHeaders(config),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!response.ok) throw await failure(response, `Insert into ${table}`)
}

/**
 * Select rows, with a raw PostgREST query string.
 *
 * The query is passed through rather than built from an object: the
 * three call sites here each want a different operator, and a query
 * builder for three queries is more code than the three queries.
 */
export async function select<T>(
  config: SupabaseConfig,
  table: string,
  query: string,
): Promise<T[]> {
  const response = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
    headers: { ...authHeaders(config), Accept: 'application/json' },
  })
  if (!response.ok) throw await failure(response, `Select from ${table}`)
  return (await response.json()) as T[]
}

/** Call a Postgres function. Used for the atomic counter increment. */
export async function rpc<T>(
  config: SupabaseConfig,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      ...authHeaders(config),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(args),
  })
  if (!response.ok) throw await failure(response, `RPC ${fn}`)
  return (await response.json()) as T
}

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

/** The bucket photographs go into. Created by the migration, and private. */
export const PHOTO_BUCKET = process.env.SUPABASE_PHOTO_BUCKET || 'submission-photos'

/**
 * Upload one object and return the path it can be read back by.
 *
 * The path, not a URL. The bucket is private — these are photographs of
 * people's hair sitting in a moderation queue, and a public bucket makes
 * every one of them a permanent, shareable link the moment it is
 * written. A reviewer reads them through a signed URL with an expiry;
 * `signedPhotoUrl` below is that, and it is the only way the bytes come
 * back out.
 *
 * `x-upsert: false` so a repeated call cannot overwrite an existing
 * object. Paths carry a random segment, so a collision means something
 * has gone wrong and should fail rather than quietly replace somebody
 * else's photograph.
 */
export async function uploadObject(
  config: SupabaseConfig,
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  const response = await fetch(
    `${config.url}/storage/v1/object/${PHOTO_BUCKET}/${encodeURI(path)}`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(config),
        'Content-Type': contentType,
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'false',
      },
      body: new Uint8Array(bytes),
    },
  )
  if (!response.ok) throw await failure(response, `Upload to ${PHOTO_BUCKET}`)
  return path
}

/**
 * A time-limited URL for one stored photograph, for the reviewer.
 *
 * Nothing in the request path calls this — it exists so that reading the
 * queue does not require making the bucket public, which is the shortcut
 * that would otherwise get taken the first time somebody needs to look
 * at a submission.
 */
export async function signedPhotoUrl(
  config: SupabaseConfig,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const response = await fetch(
    `${config.url}/storage/v1/object/sign/${PHOTO_BUCKET}/${encodeURI(path)}`,
    {
      method: 'POST',
      headers: { ...authHeaders(config), 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    },
  )
  if (!response.ok) throw await failure(response, 'Sign photo URL')
  const body = (await response.json()) as { signedURL?: string }
  if (!body.signedURL) throw new Error('Sign photo URL returned no URL')
  return `${config.url}/storage/v1${body.signedURL}`
}

/**
 * Remove objects. Used to clean up after a submission that failed to
 * record, so a half-written contribution does not leave bytes behind.
 */
export async function removeObjects(
  config: SupabaseConfig,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return
  const response = await fetch(`${config.url}/storage/v1/object/${PHOTO_BUCKET}`, {
    method: 'DELETE',
    headers: { ...authHeaders(config), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: paths }),
  })
  if (!response.ok) throw await failure(response, 'Remove photos')
}
