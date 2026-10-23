import type { AskQuestionRequest } from '../../../src/lib/types.ts'
import { ASK_OUTCOMES, MAX_ASK_QUESTION_CHARS } from '../../../src/lib/types.ts'
import { checkLimits, limitResponse } from '../_shared/limits.ts'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { serve } from '../_shared/env.ts'
import { insert, rpc, supabaseConfig } from '../_shared/supabase.ts'

/**
 * Receiving an Ask question for the team to study.
 *
 * The app answers every question on the phone; this only records what
 * was asked and what Ask did with it, so `npm run ask:study` can show
 * the questions Ask could not answer and the team can write those
 * answers next. Deployed with JWT verification off, like `submissions`,
 * because the app holds no key.
 *
 * What it keeps is exactly `AskQuestionRequest` plus the time — never the
 * caller's IP, which the rate limiter keys on for five minutes in its
 * own table and which never meets this one. The privacy policy says so;
 * a field added here is a sentence there to change first.
 *
 * Answers 204 with no body. The app does not wait on it, retry it or
 * read it: a question lost to a dead signal costs the study one row.
 */

const MATCHED = /^[a-z-]+:[A-Za-z0-9:_.%-]{1,110}$/

function validate(body: unknown): AskQuestionRequest | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>

  if (typeof b.question !== 'string') return null
  // Collapsed whitespace, so "my   hair" and "my hair" study as one.
  const question = b.question.replace(/\s+/g, ' ').trim()
  if (!question || question.length > MAX_ASK_QUESTION_CHARS) return null

  const outcome = (ASK_OUTCOMES as readonly string[]).includes(b.outcome as string)
    ? (b.outcome as AskQuestionRequest['outcome'])
    : null
  if (!outcome) return null

  const matched =
    typeof b.matched === 'string' && MATCHED.test(b.matched) ? b.matched : undefined
  const bundle =
    typeof b.bundle === 'number' && Number.isInteger(b.bundle) && b.bundle >= 0 && b.bundle <= 100000
      ? b.bundle
      : undefined

  return { question, outcome, matched, bundle }
}

async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') ?? undefined

  const limit = await checkLimits(req, 'questions')
  if (!limit.allowed) return limitResponse(limit, origin)

  const config = supabaseConfig()
  if (!config) return jsonResponse({ error: 'Not configured' }, 503, origin)

  const input = validate(await req.json().catch(() => null))
  if (!input) return jsonResponse({ error: 'Invalid question' }, 400, origin)

  try {
    await insert(config, 'ask_questions', [
      {
        question: input.question,
        outcome: input.outcome,
        matched: input.matched ?? null,
        bundle: input.bundle ?? null,
      },
    ])
  } catch (error) {
    console.error('[questions] insert failed', error)
    return jsonResponse({ error: 'Could not record that question' }, 502, origin)
  }

  // Retention without a cron job: roughly one request in two hundred
  // deletes anything past twelve months. Best-effort and off the
  // response path's outcome.
  if (Math.random() < 0.005) {
    await rpc<number>(config, 'prune_ask_questions', {}).catch((error) =>
      console.error('[questions] prune failed', error),
    )
  }

  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin') ?? undefined) })
  }
  if (req.method === 'POST') return POST(req)
  return jsonResponse({ error: 'Method not allowed' }, 405, req.headers.get('origin') ?? undefined)
})
