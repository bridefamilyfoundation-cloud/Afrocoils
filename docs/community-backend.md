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
| `supabase/functions/submissions/index.ts` | The route, an Edge Function. Validates, rate-limits, dedupes retries, stores as `Pending` |
| `supabase/functions/_shared/supabase.ts` | The Supabase connection: PostgREST and Storage over plain `fetch` |
| `supabase/functions/_shared/store.ts` | Submission records and photographs |
| `supabase/functions/_shared/limits.ts` | 3 per IP per 5 min, 500 per day. Counters in Postgres |
| `supabase/migrations/0001_community_submissions.sql` | The schema, the RLS posture, the private bucket, the counter function |
| `supabase/migrations/0002_releases.sql` | The public `releases` bucket (APK, pushed updates, `latest.json`) and the nightly counter sweep |
| `src/lib/submissions.ts` | Reads the photo files off disk, builds the wire shape, performs the `Queued` → `Sent` transition |
| `src/lib/api.ts` | `submitStyle()`, the thin fetch, and `apiConfigured()` |

### Two things to know about the route

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

The project is `runhkccoeyxfgsfrzezn`. From a checkout:

1. `npx supabase login`, then `npx supabase link --project-ref runhkccoeyxfgsfrzezn`.
2. `npm run db:push` — applies the migrations. They are idempotent.
3. `npm run backend:deploy` — deploys the function with JWT verification
   off, since the app holds no Supabase key to present.
4. `.env.production` sets `VITE_API_BASE_URL` to
   `https://runhkccoeyxfgsfrzezn.supabase.co/functions/v1`, so the APK knows
   where the function lives.

There are no secrets to copy. Supabase injects `SUPABASE_URL` and the
service key (`SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_SECRET_KEYS` on the
newer key scheme — both are read) into every function's environment.

### No SDK

`@supabase/supabase-js` is not a dependency. PostgREST and the Storage
API are plain HTTP: a package in the function bundle to save thirty
lines of `fetch` is not worth the cold start. The SDK's value is
its auth and realtime layers, and this route uses neither.

### The key, and why the client never holds one

The service key bypasses row-level security completely — it is a full
read/write credential for the database. It exists only in the Edge
Function's environment, put there by Supabase, so it is never written
into an env file, a dashboard or CI. `vite.config.ts` refuses to build
if a `VITE_`-prefixed Supabase key appears in any env file, because
anything so prefixed is inlined into the APK and every pushed update.

There is no anon key either, and the client has no Supabase import at
all. The device talks to the function and nothing else. That is what
keeps validation, rate limiting and the "nothing auto-publishes" rule
somewhere the client cannot route around — going direct from the app
with an anon key and RLS would move all three into policies and make the
rate limiter decorative.

### Row-level security

Every table has RLS enabled *and forced*, with **no policies at all**.
That is deny for `anon` and `authenticated`; `service_role` holds
`BYPASSRLS` and is the only thing that reads or writes. Grants are also
revoked explicitly, so a permissive policy added later by mistake still
does not open the table.

### The photographs are private; the releases are not

The bucket is not public. These are photographs of people's hair sitting
in a queue waiting to be read — including the ones that will be rejected
— and a public bucket makes every one of them a permanent shareable link
from the moment it is written. A reviewer reads through a signed URL with
an expiry; `signedPhotoUrl()` issues it.

The `releases` bucket is the opposite on purpose: the APK, pushed update
zips and `latest.json` are meant for everyone who has the app, and nothing
in it came from a user. Public means readable by URL only — with no storage
policy, nobody but the service role can list, write or replace anything in
it. That matters more there than anywhere: whoever can write a bundle into
`releases` can put code on every installed phone. Uploads go through the
CLI under the developer's own Supabase login, never a key on disk.

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

- **No review UI.** Nothing renders the queue; a reviewer reads it in the
  Supabase dashboard's table editor. Approving is
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
  signing a URL per photograph. `signedPhotoUrl()` exists for the tool
  that should eventually render it.

## Approving a submission, today

There is no automation. A reviewer reads the row, checks the rights claim
and the photographs, and if it passes, hand-writes the entry into
`src/content/styles.ts` with `steps`, `needs`, `occasions` and a
`hairTypes` array if it is anything other than loose-only. Photographs go
to `src/assets/images/` as `style-<id>-front|back|side|round.webp`.

Note the default: a `Style` with no `hairTypes` is loose-only. A loc
submission must opt in explicitly. Getting that wrong is the one error in
this library that damages hair rather than wasting an afternoon.
