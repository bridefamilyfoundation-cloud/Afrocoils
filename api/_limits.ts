/**
 * Rate limiting for the one route that is left.
 *
 * The three AI routes this was written for are gone, and with them the
 * bill they ran up — nothing in `api/` spends tokens any more. What
 * remains still needs this, for a different reason: `api/submissions`
 * accepts photographs from anyone, asks the caller who they are (a
 * shared secret shipped inside the APK is extractable, so it
 * authenticates nobody and only leaks the thing it was guarding), and
 * CORS does not close the hole either — `corsHeaders` decides whether a
 * *browser* may read the response, and a script with curl never asks
 * permission.
 *
 * Two counters per request:
 *
 * - **Per IP, per window.** Blunts one source hammering the endpoint.
 * - **Per route, per day.** The ceiling. An attacker with a thousand
 *   addresses walks past the first counter and stops dead at this one.
 *
 * Attempts are counted, not successes — otherwise the cap is one an
 * attacker can raise by making the requests fail.
 */

import { corsHeaders } from './_shared'

import { rpc, supabaseConfig, type SupabaseConfig } from './_supabase'

type RouteName = 'submissions'

interface RouteLimits {
  /** Requests from one address within `windowS`. */
  perIp: number
  windowS: number
  /** Requests across everyone, per UTC day. The ceiling. */
  perDay: number
}

/**
 * Deliberately generous for a real person and tight for a script.
 *
 * Submissions cost storage and a reviewer's attention rather than
 * tokens. Tight per address: writing up a style takes ten minutes, so
 * three in five minutes is already someone retrying rather than
 * contributing, and each one can carry four photographs. The daily
 * ceiling is a moderation-queue limit, not a money one — a thousand
 * pending submissions is a queue nobody will ever read to the bottom of.
 */
const LIMITS: Record<RouteName, RouteLimits> = {
  submissions: { perIp: 3, windowS: 300, perDay: 500 },
}

/* ------------------------------------------------------------------ *
 * Counter storage
 *
 * Upstash / Vercel KV over its REST API when configured, which is the
 * only version that actually works: serverless instances share no
 * memory, so an in-process counter is per-instance and a caller spread
 * across ten warm instances gets ten times the allowance.
 *
 * No SDK — the REST API is a POST with a JSON body, and a dependency
 * that ships in every function's bundle to save six lines is not worth
 * the cold start.
 * ------------------------------------------------------------------ */

interface Store {
  readonly kind: 'supabase' | 'redis' | 'memory'
  /** Increment, setting the expiry only on creation. Returns the new count. */
  incr(key: string, ttlSeconds: number): Promise<number>
}

/**
 * Supabase, via the `incr_rate_counter` function in the migration.
 *
 * A function rather than a read-then-write from here, because two
 * requests arriving together would both read 2 and both write 3, and the
 * burst this exists to stop is exactly the case where requests arrive
 * together. Postgres serialises them on the row.
 */
function supabaseStore(config: SupabaseConfig): Store {
  return {
    kind: 'supabase',
    async incr(key, ttlSeconds) {
      const count = await rpc<number>(config, 'incr_rate_counter', {
        p_key: key,
        p_ttl_seconds: ttlSeconds,
      })
      return typeof count === 'number' ? count : Number(count)
    },
  }
}

function redisConfig(): { url: string; token: string } | null {
  // Vercel KV and Upstash name these differently depending on how the
  // integration was added; accept both rather than making it a support
  // question.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/$/, ''), token } : null
}

function redisStore(config: { url: string; token: string }): Store {
  return {
    kind: 'redis',
    async incr(key, ttlSeconds) {
      const response = await fetch(`${config.url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        // EXPIRE ... NX sets the TTL only if the key has none, so a
        // counter's window starts when it is created and is not pushed
        // forward by every subsequent hit — otherwise a steady stream of
        // requests would keep a window open forever.
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, String(ttlSeconds), 'NX'],
        ]),
      })
      if (!response.ok) {
        throw new Error(`Counter store returned ${response.status}`)
      }
      const results = (await response.json()) as { result?: unknown }[]
      const count = Number(results?.[0]?.result)
      if (!Number.isFinite(count)) throw new Error('Counter store returned no count')
      return count
    },
  }
}

/**
 * Per-instance fallback, for `npm run dev` and for a deployment that has
 * not been given a store yet.
 *
 * Honest about what it is: it limits one instance, which is better than
 * nothing locally and close to nothing in production. `limitsAreShared()`
 * reports which one is in use so this cannot be mistaken for the real
 * thing.
 */
const counters = new Map<string, { count: number; expiresAt: number }>()

const memoryStore: Store = {
  kind: 'memory',
  async incr(key, ttlSeconds) {
    const now = Date.now()
    // Opportunistic sweep: the map would otherwise grow for the life of
    // the instance, and there is no timer in a serverless function.
    if (counters.size > 500) {
      for (const [k, v] of counters) if (v.expiresAt <= now) counters.delete(k)
    }
    const existing = counters.get(key)
    if (!existing || existing.expiresAt <= now) {
      counters.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 })
      return 1
    }
    existing.count += 1
    return existing.count
  },
}

let store: Store | undefined

function getStore(): Store {
  if (!store) {
    // Same precedence as the submission store, so a deployment cannot
    // end up rate-limiting against one backend and recording against
    // another.
    const supabase = supabaseConfig()
    if (supabase) {
      store = supabaseStore(supabase)
    } else {
      const config = redisConfig()
      store = config ? redisStore(config) : memoryStore
    }
    if (store.kind === 'memory') {
      console.warn(
        '[api/limits] No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY set — rate limits are per-instance only and the daily cap is not enforced across the deployment.',
      )
    }
  }
  return store
}

/** Whether the counters are shared across instances, i.e. actually binding. */
export function limitsAreShared(): boolean {
  return getStore().kind !== 'memory'
}

/* ------------------------------------------------------------------ *
 * Enforcement
 * ------------------------------------------------------------------ */

/**
 * The caller's address, as far as the platform will say.
 *
 * `x-forwarded-for` is a client-settable header everywhere except behind
 * a proxy that overwrites it, which Vercel does — so the *first* entry
 * is the real client and the rest are hops. Spoofable on a host that
 * does not, which is one more reason the daily cap and not this is the
 * control that has to hold.
 */
function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** UTC so every instance rolls the day over at the same moment. */
function dayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface LimitVerdict {
  allowed: boolean
  /** 429 when the caller is over, 503 when the cap could not be checked. */
  status?: 429 | 503
  message?: string
  retryAfterS?: number
}

/**
 * Count this request and decide whether it may proceed.
 *
 * Fails **closed** when a configured store is unreachable. That is a real
 * trade — a blip stops people contributing styles — but the alternative
 * is that losing the counter silently removes the only thing standing
 * between an open upload endpoint and whoever finds it, and a few hours
 * of refused submissions is recoverable in a way a flooded moderation
 * queue is not: the device keeps its copy queued and sends it later. When no store is configured at all it falls back to
 * the per-instance counter instead, so local development is unaffected.
 */
export async function checkLimits(req: Request, route: RouteName): Promise<LimitVerdict> {
  const limits = LIMITS[route]
  const active = getStore()

  try {
    const ip = clientIp(req)
    // The window is part of the key rather than something to reset, so a
    // fixed window falls out of the expiry with no second round trip.
    const window = Math.floor(Date.now() / 1000 / limits.windowS)
    const perIp = await active.incr(`rl:${route}:ip:${ip}:${window}`, limits.windowS)

    if (perIp > limits.perIp) {
      return {
        allowed: false,
        status: 429,
        message: 'That is a lot of requests in a short time. Give it a minute and try again.',
        retryAfterS: limits.windowS,
      }
    }

    // Only counted once the caller is past their own limit, so a single
    // abusive source cannot burn the shared daily allowance on requests
    // that were rejected anyway.
    const daily = await active.incr(`rl:${route}:day:${dayKey()}`, 60 * 60 * 25)

    if (daily > limits.perDay) {
      console.error(`[api/limits] daily cap reached for ${route}: ${daily}/${limits.perDay}`)
      return {
        allowed: false,
        status: 429,
        message: 'This feature has hit its limit for today. Please try again tomorrow.',
        retryAfterS: 60 * 60,
      }
    }

    return { allowed: true }
  } catch (error) {
    if (active.kind === 'memory') {
      // Nothing to fail closed about: there is no shared cap to protect.
      console.error('[api/limits] in-memory counter failed; allowing', error)
      return { allowed: true }
    }
    console.error('[api/limits] counter store unreachable; refusing to spend', error)
    return {
      allowed: false,
      status: 503,
      message: 'This feature is briefly unavailable. Please try again shortly.',
    }
  }
}

/**
 * Turn a refusal into a response.
 *
 * Carries `Retry-After` as well as the message, so a caller that reads
 * headers is told when to come back rather than having to guess by
 * retrying — and the message is written for the person looking at the
 * screen, since that is where it ends up.
 */
export function limitResponse(verdict: LimitVerdict, origin?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
  }
  if (verdict.retryAfterS) headers['Retry-After'] = String(verdict.retryAfterS)

  return new Response(JSON.stringify({ error: verdict.message }), {
    status: verdict.status ?? 429,
    headers,
  })
}
