/**
 * What the two remaining server-side files share.
 *
 * This used to hold the model client, the system prompts, the profile
 * validator and the constraint enforcement for three AI routes. Those
 * routes are gone — the app makes no model calls at all — and with them
 * went every reason for this file to know anything about hair. What is
 * left is the CORS policy, which `api/submissions.ts` needs because the
 * Android WebView is cross-origin to everything by definition.
 */

/**
 * The Android WebView loads from a custom scheme, so browser-style same-origin
 * does not apply and every request is cross-origin. Restrict to the app's own
 * origins plus whatever ALLOWED_ORIGINS lists for local development.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
]

export function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? []),
  ]
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

export function jsonResponse(body: unknown, status: number, origin?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}
