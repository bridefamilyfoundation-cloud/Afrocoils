-- The community submissions backend.
--
-- Everything api/ needs from Supabase: the moderation queue, the bucket
-- the photographs go in, and the rate-limit counters. Run it once against
-- a new project (SQL Editor, or `supabase db push`). It is idempotent, so
-- re-running it is safe.
--
-- Two rules run through the whole file.
--
-- First, **nothing here is readable by anyone but the service role.**
-- Every table has RLS enabled with no policy granting `anon` or
-- `authenticated` anything at all — which in Postgres means deny. The
-- device never talks to this database; it talks to api/submissions.ts,
-- which holds the service key. If a policy is ever added to let the
-- client read directly, the validation and rate limiting in api/ become
-- optional and the moderation queue becomes a public mailing list.
--
-- Second, **nothing is published by being here.** A row lands `Pending`
-- and a person moves it. The library carries a rights claim on every
-- photograph and has been burnt once already by taking images on trust.

-- ---------------------------------------------------------------------
-- The moderation queue
-- ---------------------------------------------------------------------

create table if not exists public.submissions (
  id            text primary key,

  -- The device's own id for this submission, stable across retries.
  --
  -- Unique, and that is the point: the phone keeps its copy `Queued` and
  -- retries until a 200, so a response lost on the way back means the
  -- same contribution arrives twice. Without this the moderation queue
  -- fills with duplicates that a reviewer has to spot by eye. With it,
  -- the route can recognise the retry and hand back the original id.
  client_id     text not null unique,

  received_at   timestamptz not null default now(),

  review        text not null default 'Pending'
                check (review in ('Pending', 'Approved', 'Rejected')),

  -- The validated submission: name, category, steps, kit, occasions,
  -- credit, the rights claim. JSONB rather than thirty columns because
  -- api/submissions.ts has already validated the shape and nothing here
  -- queries inside it — the reviewer reads a whole row at a time.
  body          jsonb not null,

  -- Object paths in the photo bucket, in submitted order. Paths, not
  -- URLs: the bucket is private and a reviewer reads through a signed
  -- URL with an expiry.
  photo_keys    text[] not null default '{}',

  -- Written by a reviewer, never by the submit route.
  reviewed_at   timestamptz,
  reviewer_note text
);

comment on table public.submissions is
  'Styles offered to the community library. Everything lands Pending; a person approves. Service role only.';

-- The reviewer's one query: the oldest unread submissions first, because
-- a queue read newest-first leaves the bottom of it never read.
create index if not exists submissions_pending_idx
  on public.submissions (received_at)
  where review = 'Pending';

alter table public.submissions enable row level security;

-- No policies. RLS with no policy denies everyone; the service role
-- bypasses RLS entirely and is the only thing api/ uses. This is the
-- deny-by-default posture, written down so it is clearly deliberate
-- rather than something nobody got round to.
--
-- FORCE so that even the table's owner is subject to it, which closes
-- the "connected as postgres in the SQL editor" hole for anything
-- automated.
alter table public.submissions force row level security;

-- Explicit, rather than relying on Supabase's default privileges.
--
-- RLS with no policy already denies anon and authenticated, but a
-- revoke is the stronger guard: it survives someone later adding a
-- permissive policy by mistake, which a denial-by-absence does not.
-- `service_role` holds BYPASSRLS, so it reads and writes regardless —
-- FORCE above binds the table owner, not a bypassing role.
revoke all on table public.submissions from anon, authenticated;
grant select, insert, update on table public.submissions to service_role;

-- ---------------------------------------------------------------------
-- Rate-limit counters
--
-- api/_limits.ts needs one operation: increment a key, set its expiry
-- only when the key is created, return the new count. That is trivial in
-- Redis and needs a function here, because doing it as read-then-write
-- from the route would race between concurrent requests and let a burst
-- through the limit it exists to enforce.
-- ---------------------------------------------------------------------

create table if not exists public.rate_counters (
  key        text primary key,
  count      integer not null default 0,
  expires_at timestamptz not null
);

comment on table public.rate_counters is
  'Short-lived counters for api/_limits.ts. Rows expire; see prune_rate_counters().';

create index if not exists rate_counters_expiry_idx
  on public.rate_counters (expires_at);

alter table public.rate_counters enable row level security;
alter table public.rate_counters force row level security;

revoke all on table public.rate_counters from anon, authenticated;
grant select, insert, update, delete on table public.rate_counters to service_role;

/*
 * Increment one counter atomically, creating it with a TTL if absent.
 *
 * An expired row is treated as absent — its window has passed, so the
 * count restarts rather than carrying yesterday's total into today. The
 * whole thing is one statement pair inside a function, so two requests
 * arriving together serialise on the row rather than both reading 2 and
 * both writing 3.
 *
 * `security definer` so it runs as the owner regardless of the caller,
 * and the search_path is pinned — an unpinned search_path on a definer
 * function is how one becomes a privilege-escalation route.
 */
create or replace function public.incr_rate_counter(
  p_key text,
  p_ttl_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  insert into public.rate_counters as c (key, count, expires_at)
  values (p_key, 1, now() + make_interval(secs => p_ttl_seconds))
  on conflict (key) do update
    set count = case
                  -- Window elapsed: this is a new window, not a continuation.
                  when c.expires_at <= now() then 1
                  else c.count + 1
                end,
        expires_at = case
                       when c.expires_at <= now()
                         then now() + make_interval(secs => p_ttl_seconds)
                       else c.expires_at
                     end
  returning c.count into v_count;

  return v_count;
end;
$$;

/*
 * Lock the function down, then hand it back to the one role that needs it.
 *
 * The grant is not optional. Postgres gives EXECUTE on a new function to
 * PUBLIC by default, and every role — `service_role` included — inherits
 * that. Revoking from PUBLIC therefore takes it away from `service_role`
 * too, and BYPASSRLS does not help: that is a row-security attribute, not
 * a privilege. Without the grant below, every rate-limit check fails with
 * "permission denied for function", the limiter throws, and the route
 * fails closed on every request.
 */
revoke all on function public.incr_rate_counter(text, integer) from public;
grant execute on function public.incr_rate_counter(text, integer) to service_role;

/*
 * Sweep expired counters.
 *
 * Nothing calls this on the request path — a delete on every rate-limit
 * check would make the limiter the slowest thing in the route. Rows are
 * tiny and self-correcting (an expired one is reused in place by the
 * function above), so this is housekeeping, not correctness. Schedule it
 * daily if pg_cron is enabled:
 *
 *   select cron.schedule('prune-rate-counters', '0 4 * * *',
 *                        $$select public.prune_rate_counters()$$);
 */
create or replace function public.prune_rate_counters()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_counters where expires_at <= now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_rate_counters() from public;
grant execute on function public.prune_rate_counters() to service_role;

-- ---------------------------------------------------------------------
-- The photo bucket
--
-- Private. These are photographs of people's hair sitting in a queue
-- waiting to be read, submitted on the understanding that a person will
-- review them — not published. A public bucket would make every one of
-- them a permanent shareable link from the moment it was written, including
-- the ones that are eventually rejected.
--
-- The reviewer reads them through a signed URL with an expiry, which
-- `signedPhotoUrl()` in api/_supabase.ts issues.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-photos',
  'submission-photos',
  false,
  4194304,            -- MAX_SUBMISSION_PHOTO_BYTES in src/lib/types.ts
  array['image/jpeg']  -- capturePhoto() writes nothing else
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage policies, for the same reason the tables have none: the
-- service role bypasses them and nothing else is allowed to touch the
-- bucket. Adding an `anon` read policy here would undo the privacy
-- decision above.
