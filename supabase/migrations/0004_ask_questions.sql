-- Ask questions: what people type into Ask, for the team to study.
--
-- Decided 2026-10-23: every question typed into Ask is sent here while
-- the person has sharing on (on by default, switched off on About). The
-- privacy policy, FAQ, About, the landing site and the Play data-safety
-- note were rewritten in the same change; if this table grows a column,
-- those pages are what has to change first.
--
-- What a row is, and is not:
--
-- - The words typed, what Ask did with them, the record it answered
--   with, and the pushed-update number. Nothing from the profile, no
--   device id, no account, and no IP address — the rate limiter keys on
--   the IP for five minutes in its own counter table, and that never
--   meets this one. Two questions from one phone are indistinguishable
--   from two questions from two phones, on purpose.
-- - Kept twelve months at most. `prune_ask_questions()` deletes older
--   rows; the questions function calls it now and then, so retention
--   does not depend on anyone remembering a cron job.
--
-- Same posture as every table here: RLS forced with no policies, grants
-- revoked from anon and authenticated, service role only. The device
-- never reads this; it posts to the function, which validates and
-- rate-limits first.

create table if not exists public.ask_questions (
  id        bigint generated always as identity primary key,
  asked_at  timestamptz not null default now(),
  question  text not null check (char_length(question) between 1 and 160),
  outcome   text not null
            check (outcome in ('answer', 'quote', 'styles', 'products', 'pending', 'none', 'off-topic', 'chat')),
  -- The Ask record answered with, e.g. 'answer:always-dry'. Null when
  -- nothing was (none, off-topic, chat).
  matched   text check (matched is null or char_length(matched) <= 120),
  bundle    integer check (bundle is null or bundle between 0 and 100000),
  -- Set by whoever has read it during a study, never by the route.
  reviewed  boolean not null default false
);

comment on table public.ask_questions is
  'Questions typed into Ask, shared anonymously while sharing is on. No profile, no device id, no IP. Kept 12 months. Service role only.';

-- A study reads the unanswered backlog newest first.
create index if not exists ask_questions_outcome_idx
  on public.ask_questions (outcome, asked_at desc);

alter table public.ask_questions enable row level security;
alter table public.ask_questions force row level security;
revoke all on table public.ask_questions from anon, authenticated;
grant select, insert, update, delete on table public.ask_questions to service_role;

-- Retention, enforced by the database rather than by a reminder.
create or replace function public.prune_ask_questions()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.ask_questions
    where asked_at < now() - interval '12 months'
    returning 1
  )
  select count(*)::integer from gone;
$$;

-- 0003 closed new functions to anon and authenticated by default; said
-- again here so this file stands on its own.
revoke execute on function public.prune_ask_questions() from public, anon, authenticated;
grant execute on function public.prune_ask_questions() to service_role;
