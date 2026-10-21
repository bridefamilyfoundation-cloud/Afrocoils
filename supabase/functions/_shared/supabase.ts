/**
 * The Supabase connection, from inside the project's own Edge Function.
 *
 * Supabase is three things this route needs: a durable record store, a
 * blob store for the photographs and somewhere to keep the rate-limit
 * counters. One project serves all three.
 *
 * **No SDK.** PostgREST and the Storage API are plain HTTP, and
 * `@supabase/supabase-js` would be a dependency in the function bundle to
 * save about thirty lines of `fetch`. Its value is its realtime and auth
 * layers, neither of which this route has any use for.
 *
 * ## The key
 *
 * The service key bypasses row-level security completely. Running as an
 * Edge Function is what keeps it a server credential and nothing else:
 * Supabase injects `SUPABASE_URL` and the service key into the function's
 * environment itself, so the key is never copied into a dashboard, an env
 * file or a CI secret, and there is no build step that could inline it
 * into the APK. The client never talks to Supabase's database or storage
 * at all — it talks to this function, which is what keeps the validation,
 * the rate limits and the "nothing auto-publishes" rule in one place the
 * device cannot route around.
 *
 * (`vite.config.ts` still refuses to build if a `VITE_`-prefixed Supabase
 * key ever appears in an env file, because that slip is silent and
 * unrecoverable once a release ships with it.)
 */
import { env } from './env.ts'

export interface SupabaseConfig {
  url: string
  serviceKey: string
}

/**
 * The service key, in whichever form the project provides it.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` is the legacy JWT key. Projects on the newer
 * API keys also get `SUPABASE_SECRET_KEYS`, a JSON object of named
 * `sb_secret_…` keys; either authorises as the service role.
 */
function serviceKey(): string | undefined {
  const legacy = env('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  const raw = env('SUPABASE_SECRET_KEYS')
  if (!raw) return undefined
  try {
    const keys = JSON.parse(raw) as Record<string, string>
    return keys.default ?? Object.values(keys)[0]
  } catch {
    return undefined
  }
}

let cached: SupabaseConfig | null | undefined

export function supabaseConfig(): SupabaseConfig | null {
  if (cached !== undefined) return cached
  const url = env('SUPABASE_URL')
  const key = serviceKey()
  cached = url && key ? { url: url.replace(/\/$/, ''), serviceKey: key } : null
  return cached
}

export function supabaseConfigured(): boolean {
  return supabaseConfig() !== null
}

function authHeaders(config: SupabaseConfig): Record<string, string> {
  // `apikey` identifies the project. A legacy JWT key is also sent as the
  // bearer token, which is what PostgREST authorises against; an
  // `sb_secret_` key is not a JWT and is rejected as a bearer, so it goes
  // in `apikey` alone and the gateway mints the service-role token.
  const headers: Record<string, string> = { apikey: config.serviceKey }
  if (config.serviceKey.startsWith('eyJ')) headers.Authorization = `Bearer ${config.serviceKey}`
  return headers
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
 * route already holds everything it returns to the device.
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
 * The query is passed through rather than built from an object: a query
 * builder for one query is more code than the query.
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
export const PHOTO_BUCKET = env('SUPABASE_PHOTO_BUCKET') || 'submission-photos'

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
  bytes: Uint8Array,
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
      body: bytes,
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
