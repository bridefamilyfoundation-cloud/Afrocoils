/**
 * The function's environment, and the two Deno globals it touches.
 *
 * Declared here rather than pulled from Deno's own types so that the
 * repo's `tsc -b` can typecheck these files alongside the app — which is
 * what keeps `SubmissionRequest` one contract rather than two. Nothing
 * else in `supabase/functions/` reaches for a runtime-specific API: the
 * code is `fetch`, `Request`, `Response`, `crypto` and `atob`, which
 * Deno, Node and the browser all have.
 */
declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (req: Request) => Response | Promise<Response>): unknown
}

export function env(name: string): string | undefined {
  return Deno.env.get(name)
}

export function serve(handler: (req: Request) => Response | Promise<Response>): void {
  Deno.serve(handler)
}
