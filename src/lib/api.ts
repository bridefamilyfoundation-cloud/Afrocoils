import type { SubmissionRequest, SubmissionResponse } from './types'

/**
 * The app's only network call that carries the user's data.
 *
 * (The other request it makes is the version check in `updates.ts`, a
 * GET of a static file that sends nothing.) Everything else — the style library, the care guides, the quiz, the
 * porosity test, the calendar, the growth maths — is computed on the
 * device from content shipped inside the APK, and keeps working with the
 * radio off. The one exception is offering a style to the community
 * library, because that is by definition something that has to leave the
 * phone to mean anything.
 *
 * In the browser `BASE_URL` is empty and the request hits the Vite dev
 * proxy. In the APK there is no origin to speak of, so VITE_API_BASE_URL
 * must point at the project's Edge Functions —
 * `https://<ref>.supabase.co/functions/v1` — and `/submissions` is the
 * function's name under it.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Whether this build knows where the server is.
 *
 * In a browser an empty base URL means same-origin, which is right for
 * `npm run dev` against a local function runtime. In the APK there is no
 * origin to fall back on — the WebView loads from a custom scheme — so
 * an unset `VITE_API_BASE_URL` means there is genuinely nowhere to send
 * a submission, and the screen says that instead of offering a button
 * whose only outcome is an error.
 */
export function apiConfigured(native: boolean): boolean {
  return BASE_URL.length > 0 || !native
}

export class ApiError extends Error {}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  return body?.error ?? `Request failed (${response.status})`
}

/**
 * Offer a style to the community library.
 *
 * Unlike a normal API call this one is not the point of the feature —
 * the device's own copy is. A submission is written to the profile as
 * `Queued` before this is ever called, so every failure mode here is
 * recoverable by trying again later, and none of them costs the
 * contributor the ten minutes they spent writing it up.
 *
 * That is also why this throws rather than returning a result union: the
 * caller's job is to leave the row `Queued` on any error, which one
 * `catch` does more reliably than a branch nobody remembers to write.
 */
export async function submitStyle(
  input: SubmissionRequest,
  signal?: AbortSignal,
): Promise<SubmissionResponse> {
  const response = await fetch(`${BASE_URL}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  if (!response.ok) throw new ApiError(await readError(response))
  return (await response.json()) as SubmissionResponse
}
