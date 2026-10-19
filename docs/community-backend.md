# The community submissions backend

The style library is contributed content and nothing else. This is the
path a contribution takes from a phone into it, what exists today, and
the one piece still missing.

## Why the device queues first

A submission is written to the profile as `Queued` the moment the
contributor taps submit, before any network call. Everything else is an
attempt to move it to `Sent`.

That ordering is the whole design. Writing up a style takes ten minutes —
a name, a method, the kit, four photographs — and the failure this
feature must never have is losing that to a dropped connection or a
server that is not there. So the queue is the feature and the send is the
optimisation, and every error path leaves the local row untouched.

`SUBMISSION_STATUSES` stays two-valued (`Queued`, `Sent`) because that is
all a phone can know: whether it managed to hand the thing over. The
reviewer's vocabulary (`REVIEW_STATES`) lives server-side and does not
cross the wire back, which is why there is no `Rejected` on the device.

## The pieces

| File | Does |
| --- | --- |
| `src/lib/types.ts` | `SubmissionRequest` / `SubmissionResponse`, imported by both sides so a shape change fails typecheck |
| `api/submissions.ts` | The route. Validates, rate-limits, dedupes retries, stores as `Pending` |
| `api/_supabase.ts` | The Supabase connection: PostgREST, Storage, and the guard that keeps the service key out of the client |
| `api/_store.ts` | Submission records and photographs. Supabase in production, Upstash/KV if still configured, memory for local dev |
| `api/_limits.ts` | A `submissions` route: 3 per IP per 5 min, 500 per day. Counters in Supabase |
| `supabase/migrations/0001_community_submissions.sql` | The schema, the RLS posture, the private bucket, the counter function |
| `src/lib/submissions.ts` | Reads the photo files off disk, builds the wire shape, performs the `Queued` → `Sent` transition |
| `src/lib/api.ts` | `submitStyle()`, the thin fetch, and `apiConfigured()` |

### Two things that deliberately differ from the other routes

**It refuses before it reads.** `POST` checks that a durable record store
*and* a photo store are configured and returns 503 if either is not —
before parsing the body. Accepting a submission this instance cannot keep
would hand the device a 200, flip its copy to `Sent`, and lose the whole
thing when the instance recycles, with the contributor believing it
arrived and no way to retry. A 503 leaves their copy `Queued`.

**Nothing it accepts is published.** Every submission lands `Pending`.
The library carries a rights claim on every photograph — see
`src/assets/images/README.md` for what happened the last time it took
images on trust — and a queue that auto-publishes is not a queue.

## Supabase

One project is the whole backend: the moderation queue, the photographs
and the rate-limit counters. It replaced two services that had to be
provisioned separately — Upstash for records and counters, and a Vercel
Blob store for photographs that was never implemented.

### Setting it up

1. Create a Supabase project.
2. Run `supabase/migrations/0001_community_submissions.sql` against it —
   SQL Editor, or `supabase db push`. It is idempotent.
3. Copy **Project URL** and the **`service_role`** key from Project
   Settings → API into `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in
   the deployment's environment.
4. Set `VITE_API_BASE_URL` in `.env.production` so the APK knows where
   the function lives.

That is all of it. `storeIsDurable()` and `photoStoreConfigured()` both
become true from the same pair, so there is no half-configured state
where records are kept and photographs are not.

### No SDK

`@supabase/supabase-js` is not a dependency. PostgREST and the Storage
API are plain HTTP and `api/` already made this call once, against
Upstash, for the same reason: a package in every function bundle to save
thirty lines of `fetch` is not worth the cold start. The SDK's value is
its auth and realtime layers, and this route uses neither.

### The key, and why the client never holds one

`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security completely — it
is a full read/write credential for the database. It lives in
`process.env`, which only exists server-side, and **must never** be given
a `VITE_` prefix: anything so prefixed is inlined at build time and ships
inside the APK, readable by anyone who downloads it.
`assertKeyIsServerOnly()` in `api/_supabase.ts` throws if a
`VITE_`-prefixed Supabase credential ever appears, because that failure
is otherwise silent and total.

There is no anon key here either, and the client has no Supabase import
at all. The device talks to `api/submissions.ts` and nothing else. That
is what keeps validation, rate limiting and the "nothing auto-publishes"
rule somewhere the client cannot route around — going direct from the
app with an anon key and RLS would move all three into policies and make
the rate limiter decorative.

### Row-level security

Every table has RLS enabled *and forced*, with **no policies at all**.
That is deny for `anon` and `authenticated`; `service_role` holds
`BYPASSRLS` and is the only thing that reads or writes. Grants are also
revoked explicitly, so a permissive policy added later by mistake still
does not open the table.

### The photographs are private

The bucket is not public. These are photographs of people's hair sitting
in a queue waiting to be read — including the ones that will be rejected
— and a public bucket makes every one of them a permanent shareable link
from the moment it is written. A reviewer reads through a signed URL with
an expiry; `signedPhotoUrl()` issues it.

### Retries are idempotent

`client_id` is `unique`, and the route looks it up *before* it writes
anything. The device keeps its copy `Queued` and retries until it sees a
200, so a response lost on the way back means the same contribution
arrives twice; answering with the original id makes the second one a
no-op instead of a duplicate row and a second set of photographs. If the
record write fails after photographs have uploaded, the route removes
them again — the server-side version of the orphan rule the device
follows.

## What is not built

- **No review UI.** `listPendingSubmissions()` and `getSubmission()` exist
  so a reviewer can read the queue; nothing renders it. Approving is
  currently "read the row, write the entry into `src/content/styles.ts`,
  ship a release" — which is deliberate while the volume is zero, and the
  point at which that stops being true is the point to build the tool.
- **No route back to the device.** A contributor cannot see that their
  submission was rejected. That needs a read endpoint and an id the phone
  can poll on; `SubmissionResponse.id` is returned with that in mind but
  nothing stores it yet.
- **A reviewer cannot approve from anywhere but the SQL editor.** The
  queue is a table with an index on it, which is a large improvement on a
  Redis list, but reading a submission still means writing SQL and
  signing a URL per photograph. `listPendingSubmissions()`,
  `getSubmission()` and `signedPhotoUrl()` exist for the tool that should
  eventually render it.

## Approving a submission, today

There is no automation. A reviewer reads the row, checks the rights claim
and the photographs, and if it passes, hand-writes the entry into
`src/content/styles.ts` with `steps`, `needs`, `occasions` and a
`hairTypes` array if it is anything other than loose-only. Photographs go
to `src/assets/images/` as `style-<id>-front|back|side|round.webp`.

Note the default: a `Style` with no `hairTypes` is loose-only. A loc
submission must opt in explicitly. Getting that wrong is the one error in
this library that damages hair rather than wasting an afternoon.
