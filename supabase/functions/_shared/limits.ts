/**
 * Rate limiting for the submissions function.
 *
 * `submissions` accepts photographs from anyone without asking who they
 * are — a shared secret shipped inside the APK is extractable, so it
 * would authenticate nobody and only leak the thing it was guarding —
 * and CORS does not close the hole either: it decides whether a
 * *browser* may read the response, and a script with curl never asks.
 *
 * Two counters per request:
 *
 * - **Per IP, per window.** Blunts one source hammering the endpoint.
 * - **Per route, per day.** The ceiling. An attacker with a thousand
 *   addresses walks past the first counter and stops dead at this one.
 *
 * Attempts are counted, not successes — otherwise the cap is one an
 * attacker can raise by making the requests fail.
 *
 * The counters live in Postgres behind `incr_rate_counter` (migration
 * 0001), which increments atomically: a read-then-write from here would
 * let two simultaneous requests both read 2 and both write 3, and the
 * burst this exists to stop is exactly the case where requests arrive
 * together.
 */

import { corsHeaders } from './cors.ts'
import { rpc, supabaseConfig } from './supabase.ts'

type RouteName = 'submissions' | 'questions'

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
 * Writing up a style takes ten minutes, so three in five minutes is
 * already someone retrying rather than contributing, and each one can
 * carry four photographs. The daily ceiling is a moderation-queue limit:
 * a thousand pending submissions is a queue nobody will read to the end.
 */
const LIMITS: Record<RouteName, RouteLimits> = {
  submissions: { perIp: 3, windowS: 300, perDay: 500 },
  // A person asking Ask a run of follow-ups sends one row each, and
  // thirty in five minutes is already more than anyone types. The daily
  // ceiling keeps a script from filling the table the study reads.
  questions: { perIp: 30, windowS: 300, perDay: 20000 },
}

async function incr(key: string, ttlSeconds: number): Promise<number> {
  const config = supabaseConfig()
  if (!config) throw new Error('No Supabase configuration for the rate limiter')
  const count = await rpc<number>(config, 'incr_rate_counter', {
    p_key: key,
    p_ttl_seconds: ttlSeconds,
  })
  return typeof count === 'number' ? count : Number(count)
}

/**
 * The caller's address, as far as the platform will say.
 *
 * Supabase's edge puts the client first in `x-forwarded-for` and the
 * hops after it. Spoofable on a host that does not overwrite it, which
 * is one more reason the daily cap and not this is the control that has
 * to hold.
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
 * Fails **closed** when the counter store is unreachable. That is a real
 * trade — a blip stops people contributing styles — but the alternative
 * is that losing the counter silently removes the only thing standing
 * between an open upload endpoint and whoever finds it, and a few hours
 * of refused submissions is recoverable: the device keeps its copy
 * queued and sends it later.
 */
export async function checkLimits(req: Request, route: RouteName): Promise<LimitVerdict> {
  const limits = LIMITS[route]

  try {
    const ip = clientIp(req)
    // The window is part of the key rather than something to reset, so a
    // fixed window falls out of the expiry with no second round trip.
    const window = Math.floor(Date.now() / 1000 / limits.windowS)
    const perIp = await incr(`rl:${route}:ip:${ip}:${window}`, limits.windowS)

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
    const daily = await incr(`rl:${route}:day:${dayKey()}`, 60 * 60 * 25)

    if (daily > limits.perDay) {
      console.error(`[limits] daily cap reached for ${route}: ${daily}/${limits.perDay}`)
      return {
        allowed: false,
        status: 429,
        message: 'This feature has hit its limit for today. Please try again tomorrow.',
        retryAfterS: 60 * 60,
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('[limits] counter store unreachable; refusing', error)
    return {
      allowed: false,
      status: 503,
      message: 'This feature is briefly unavailable. Please try again shortly.',
    }
  }
}

/**
 * Turn a refusal into a response, with `Retry-After` so a caller that
 * reads headers is told when to come back rather than guessing.
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
