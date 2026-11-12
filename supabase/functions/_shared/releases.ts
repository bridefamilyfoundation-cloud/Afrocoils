/**
 * The kill switch, as the server passes it on.
 *
 * `floor` in latest.json (`ReleaseFloor` in types.ts) retires every
 * copy of the app below it. Phones read latest.json themselves on the
 * update check, but that check can be switched off on About, so every
 * membership answer repeats the floor: a phone cannot open the app
 * without one of those. One source — the same public file — so the two
 * channels cannot disagree, and setting it is one command
 * (`npm run release:floor`), not a deploy.
 *
 * Read over plain HTTP and cached five minutes per instance. A failed
 * read answers the last value, or nothing: the phone then keeps the
 * floor it already has, which is the safe side for a file that is
 * briefly absent while it is being replaced.
 */
import type { ReleaseFloor } from '../../../src/lib/types.ts'
import { parseFloor } from '../../../src/lib/types.ts'
import { env } from './env.ts'

let cached: { floor: ReleaseFloor; at: number } | undefined

export async function releaseFloor(): Promise<ReleaseFloor | undefined> {
  if (cached && Date.now() - cached.at < 300_000) return cached.floor
  const base = env('SUPABASE_URL')
  if (!base) return undefined
  try {
    const response = await fetch(`${base}/storage/v1/object/public/releases/latest.json`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return cached?.floor
    const manifest = (await response.json()) as { floor?: unknown } | null
    // A manifest with no floor is an answer too: nothing is retired.
    const floor = parseFloor(manifest?.floor) ?? { bundle: 0, versionCode: 0 }
    cached = { floor, at: Date.now() }
    return floor
  } catch {
    return cached?.floor
  }
}
