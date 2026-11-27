-- The mailing list, broadcasts, and a promotion on transfer prices (2026-11-27).
--
-- The mailing list is the addresses the owner may write to all at once
-- from the admin site: people who asked to hear from AfroCoils, added by
-- hand, and members, imported with one button. Being on it is not being
-- a member. Every message carries an unsubscribe link and a one-click
-- List-Unsubscribe header; unsubscribing keeps the row, with
-- `unsubscribed_at` set, as the record never to write to that address
-- again — re-adding it by hand does not undo that.
--
-- The privacy policy, FAQ, the landing site and docs/play-release.md
-- were rewritten in the same change: until this, they said "no
-- newsletters, no marketing".
--
-- Same posture as every table here: RLS forced, no policies, grants
-- revoked, service role only.

create table if not exists public.mailing_list (
  email           text primary key check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  name            text check (name is null or char_length(name) <= 80),
  -- How the address got here: typed in on the admin site, or imported from members.
  source          text not null default 'admin' check (source in ('admin', 'member')),
  added_at        timestamptz not null default now(),
  added_by        text,
  -- The secret in this address's unsubscribe link. Random, so the link
  -- names nobody and cannot be guessed for someone else.
  unsubscribe_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  unsubscribed_at timestamptz
);

comment on table public.mailing_list is
  'Addresses the admin may send a broadcast to. A row with unsubscribed_at is a do-not-email record and is never sent to. Service role only.';

create index if not exists mailing_list_subscribed_idx on public.mailing_list (added_at desc) where unsubscribed_at is null;

-- One row per message sent to the list: what was said, by whom, to how many.
create table if not exists public.broadcasts (
  id          bigint generated always as identity primary key,
  subject     text not null check (char_length(subject) between 1 and 200),
  body        text not null check (char_length(body) between 1 and 20000),
  sent_by     text not null,
  sent_at     timestamptz not null default now(),
  recipients  integer not null default 0,
  failed      integer not null default 0
);

comment on table public.broadcasts is
  'Messages sent to the mailing list from the admin site, with how many went out. Service role only.';

-- ---------------------------------------------------------------------
-- A promotion: a percentage off the bank-transfer prices
-- ---------------------------------------------------------------------

-- One promotion at a time, beside the prices it discounts. It applies
-- while now is between the two times, to the plans listed. Card plans
-- are priced by Paystack and are not discounted (yet): the phone says
-- the promotion is for bank transfer.
alter table public.transfer_settings
  add column if not exists promo_name      text check (promo_name is null or char_length(promo_name) between 1 and 60),
  add column if not exists promo_percent   smallint check (promo_percent is null or promo_percent between 1 and 90),
  add column if not exists promo_plans     text[] not null default '{monthly,biannual,annual}'
    check (promo_plans <@ array['monthly', 'biannual', 'annual']::text[]),
  add column if not exists promo_starts_at timestamptz,
  add column if not exists promo_ends_at   timestamptz,
  add constraint transfer_settings_promo_window check (
    promo_percent is null or (promo_starts_at is not null and promo_ends_at is not null and promo_ends_at > promo_starts_at)
  );

-- What a transfer was discounted by, so the reviewer sees why the amount
-- is below the list price ("Black Friday, 20% off").
alter table public.transfers
  add column if not exists promo text check (promo is null or char_length(promo) <= 100);

-- ---------------------------------------------------------------------
-- Lock it down
-- ---------------------------------------------------------------------

alter table public.mailing_list enable row level security;
alter table public.mailing_list force row level security;
alter table public.broadcasts enable row level security;
alter table public.broadcasts force row level security;

revoke all on table public.mailing_list, public.broadcasts from anon, authenticated;
grant select, insert, update, delete on table public.mailing_list, public.broadcasts to service_role;
