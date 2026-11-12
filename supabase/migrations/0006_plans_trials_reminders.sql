-- Three plans, a free trial, payment verification and reminder emails.
--
-- Decided 2026-11-11: membership is offered as Monthly, 6 Months and
-- Annual (each its own Paystack plan; the prices live there, not here),
-- with a three-day free trial for new members, no card needed. The
-- privacy policy, Terms, FAQ, Docs, the landing site and
-- docs/play-release.md were rewritten in the same change.
--
-- Same posture as 0005: RLS forced, no policies, service role only.

-- ---------------------------------------------------------------------
-- Members: the plan, the period, the trial, the pending checkout
-- ---------------------------------------------------------------------

alter table public.members
  -- The plan of the last charge. Null: never paid, or access by hand.
  add column if not exists plan text check (plan is null or plan in ('monthly', 'biannual', 'annual')),
  -- When the current paid period began (the last charge's date).
  add column if not exists period_start timestamptz,
  -- When the free trial ends. Set once, by billing/trial; never cleared.
  add column if not exists trial_ends_at timestamptz,
  -- The reference of the last checkout started, so a status check can
  -- ask Paystack whether it was paid if the webhook never arrives.
  add column if not exists pending_reference text,
  -- The last reminder email sent, as `<kind>:<date it was about>`, so
  -- the daily run sends each one once.
  add column if not exists last_notice text check (last_notice is null or char_length(last_notice) <= 80);

create index if not exists members_trial_ends_idx on public.members (trial_ends_at) where trial_ends_at is not null;

-- ---------------------------------------------------------------------
-- Trials: one per person
-- ---------------------------------------------------------------------

-- Keyed on the address with its `+tag` dropped (and, for Gmail, its
-- dots), so ana+1@gmail.com and a.na@gmail.com are the same person as
-- ana@gmail.com. The primary key is what makes a second trial
-- impossible, not a check the function might race past.
create table if not exists public.trials (
  key         text primary key check (key = lower(btrim(key)) and char_length(key) between 3 and 254),
  email       text not null,
  started_at  timestamptz not null default now(),
  ends_at     timestamptz not null
);

comment on table public.trials is
  'Free trials taken, one per canonical address. Service role only.';

alter table public.trials enable row level security;
alter table public.trials force row level security;
revoke all on table public.trials from anon, authenticated;
grant select, insert, update, delete on table public.trials to service_role;

-- ---------------------------------------------------------------------
-- The daily reminder run
-- ---------------------------------------------------------------------

-- Every day at 07:00 UTC (08:00 in Lagos) pg_cron asks billing/reminders
-- to send what is due: a trial ending tomorrow, a membership that is not
-- renewing about to end, a renewal coming up, a membership that has
-- just ended. The route answers only to `x-cron-secret`, which must
-- match the function's CRON_SECRET. The same value is kept in Vault as
-- `cron_secret`, set once by hand (docs/membership-setup.md), so it is
-- never written into this file, which is public.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'membership-reminders',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://runhkccoeyxfgsfrzezn.supabase.co/functions/v1/billing/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
