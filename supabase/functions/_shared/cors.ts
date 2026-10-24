/**
 * The CORS policy for the submissions function.
 *
 * The Android WebView loads from a custom scheme, so browser-style
 * same-origin does not apply and every request is cross-origin. Restrict
 * to the app's own origins plus whatever ALLOWED_ORIGINS lists (set with
 * `supabase secrets set`) for local development.
 *
 * CORS is not access control — it decides what a *browser* may read, and
 * a script with curl never asks. The rate limits in `limits.ts` are what
 * stand between this endpoint and whoever finds it.
 */
import { env } from './env.ts'

const DEFAULT_ALLOWED_ORIGINS = [
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
]

export function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(env('ALLOWED_ORIGINS')?.split(',').map((o) => o.trim()) ?? []),
  ]
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    // Every response here is about one request and is never worth
    // caching, and none of them is a page: a browser must not sniff one
    // into HTML, frame it, or send a referrer onward from it.
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
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
