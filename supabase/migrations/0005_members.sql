-- Membership, sign-in codes, payments and the support inbox.
--
-- Decided 2026-11-05: every feature of the app is for paying members.
-- A member is an email address, confirmed with a six-digit code and paid
-- for as a monthly Paystack subscription. The privacy policy, FAQ,
-- About, Docs, the landing site and docs/play-release.md were rewritten
-- in the same change; a column added here is a sentence there first.
--
-- Same posture as every table in this project: RLS enabled and forced
-- with no policies, grants revoked from anon and authenticated, service
-- role only. The phone and the admin site talk to the `auth`, `billing`
-- and `admin` functions, never to this database.

-- ---------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------

create table if not exists public.members (
  -- Lower-cased and trimmed by the functions before it gets here; the
  -- check makes a mixed-case duplicate impossible rather than unlikely.
  email                 text primary key
                        check (email = lower(btrim(email)) and char_length(email) between 3 and 254),

  -- Paystack's subscription states, or `none` before the first payment.
  status                text not null default 'none'
                        check (status in ('active', 'non-renewing', 'attention', 'cancelled', 'none')),

  -- The end of the paid period. Access is `now() < paid_until + 3 days`
  -- (MEMBERSHIP_GRACE_DAYS in src/lib/types.ts). Null: never paid.
  paid_until            timestamptz,

  -- Where the access came from: a Paystack subscription, or an admin
  -- adding or extending someone by hand.
  source                text not null default 'paystack' check (source in ('paystack', 'manual')),

  paystack_customer     text,
  paystack_subscription text unique,
  -- Paystack's per-subscription token, needed to cancel or manage it.
  paystack_email_token  text,

  -- Set by an admin, never by a route the phone can reach.
  note                  text check (note is null or char_length(note) <= 500),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  last_seen_at          timestamptz
);

comment on table public.members is
  'Paying members, by email. Written by the billing webhook and the admin site. Service role only.';

create index if not exists members_paid_until_idx on public.members (paid_until desc nulls last);

-- ---------------------------------------------------------------------
-- Sign-in codes
-- ---------------------------------------------------------------------

-- One live code per address and purpose; asking again replaces it. The
-- code itself is never stored, only an HMAC of it keyed on the
-- function's AUTH_SECRET, so a read of this table opens nothing.
create table if not exists public.login_codes (
  email       text not null check (email = lower(btrim(email))),
  purpose     text not null check (purpose in ('member', 'admin')),
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    integer not null default 0,
  created_at  timestamptz not null default now(),
  primary key (email, purpose)
);

comment on table public.login_codes is
  'Pending sign-in codes, hashed. Ten minutes, five attempts. Service role only.';

-- ---------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------

-- One row per successful Paystack charge, for the admin's payments list
-- and for answering "I paid but nothing happened". The reference is
-- unique, which is what makes a webhook Paystack retries harmless.
create table if not exists public.payments (
  reference     text primary key,
  email         text not null,
  amount        bigint not null,
  currency      text not null,
  paid_at       timestamptz not null,
  plan          text,
  received_at   timestamptz not null default now()
);

comment on table public.payments is
  'Successful Paystack charges, from the webhook. No card data: Paystack keeps that. Service role only.';

create index if not exists payments_email_idx on public.payments (email, paid_at desc);

-- ---------------------------------------------------------------------
-- Support inbox
-- ---------------------------------------------------------------------

-- Mail to support@ and hello@afrocoils.app arrives through Resend's
-- inbound webhook; replies written on the admin site are sent through
-- Resend and recorded here too, so a thread reads in order.
create table if not exists public.support_messages (
  id            bigint generated always as identity primary key,
  -- The Resend email id. Unique so a redelivered webhook is a no-op.
  resend_id     text unique,
  direction     text not null check (direction in ('in', 'out')),
  mailbox       text not null check (mailbox in ('support', 'hello')),
  from_address  text not null,
  to_address    text not null,
  subject       text not null default '',
  -- Plain text only. HTML mail is reduced to text before it is stored,
  -- so the admin site never renders a stranger's markup.
  body          text not null default '',
  message_id    text,
  -- The first message's id in this conversation (itself, for a new one).
  thread_id     bigint,
  -- Inbound messages only: open until a person closes the thread.
  status        text not null default 'open' check (status in ('open', 'closed')),
  read          boolean not null default false,
  sent_by       text,
  created_at    timestamptz not null default now()
);

comment on table public.support_messages is
  'Mail to and from support@ and hello@afrocoils.app. Text only. Service role only.';

create index if not exists support_messages_thread_idx on public.support_messages (thread_id, created_at);
create index if not exists support_messages_inbox_idx on public.support_messages (direction, status, created_at desc);

-- ---------------------------------------------------------------------
-- Lock it down
-- ---------------------------------------------------------------------

alter table public.members enable row level security;
alter table public.members force row level security;
alter table public.login_codes enable row level security;
alter table public.login_codes force row level security;
alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.support_messages enable row level security;
alter table public.support_messages force row level security;

revoke all on table public.members, public.login_codes, public.payments, public.support_messages
  from anon, authenticated;
grant select, insert, update, delete
  on table public.members, public.login_codes, public.payments, public.support_messages
  to service_role;
revoke all on sequence public.support_messages_id_seq from anon, authenticated;
grant usage, select on sequence public.support_messages_id_seq to service_role;

-- ---------------------------------------------------------------------
-- Counting a code attempt atomically
-- ---------------------------------------------------------------------

-- Read-then-write from the function would let five parallel guesses
-- each read attempts = 0. This increments and returns in one statement.
create or replace function public.bump_login_attempt(p_email text, p_purpose text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.login_codes
     set attempts = attempts + 1
   where email = p_email and purpose = p_purpose
  returning attempts;
$$;

revoke execute on function public.bump_login_attempt(text, text) from public, anon, authenticated;
grant execute on function public.bump_login_attempt(text, text) to service_role;
