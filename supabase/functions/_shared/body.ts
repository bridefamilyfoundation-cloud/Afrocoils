/**
 * Reading a request body with a ceiling on it.
 *
 * `req.json()` reads whatever arrives, however large, before the route
 * gets to say no — so a caller could make the function buffer far more
 * than any real submission is. This refuses on a declared
 * `Content-Length` before reading anything, and counts bytes as they
 * arrive for a body sent without one, stopping at the ceiling.
 */

export class BodyTooLarge extends Error {}

/** The parsed JSON body, `null` when it is not JSON, or throws `BodyTooLarge`. */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLarge()
  if (!req.body) return null

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new BodyTooLarge()
    }
    chunks.push(value)
  }

  const all = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    all.set(chunk, at)
    at += chunk.length
  }
  try {
    return JSON.parse(new TextDecoder().decode(all))
  } catch {
    return null
  }
}
