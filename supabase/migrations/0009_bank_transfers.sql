-- Paying by bank transfer, approved by a person (2026-11-20).
--
-- A member pays into the company account from their own bank, then
-- sends the app a screenshot of the receipt with the name on the
-- account they paid from, the day they paid and the bank's reference.
-- An admin compares it with the bank statement and approves or rejects
-- it on the admin site. Approving opens the plan, records the payment
-- and emails the member; rejecting emails them the reason.
--
-- The receipt itself never goes in the database. The billing function
-- checks it (`scanJpeg`, the same check as style photographs), rebuilds
-- it from the picture alone and puts it in the private `payment-receipts`
-- bucket; the row below holds only its path and fingerprint. The image
-- is deleted 90 days after the decision by the daily run.
--
-- The privacy policy, Terms, FAQ, About, Docs, the landing site and
-- docs/play-release.md were rewritten in the same change.
--
-- Same posture as every table here: RLS forced, no policies, grants
-- revoked, service role only.

-- ---------------------------------------------------------------------
-- What the member is told: the account and the prices
-- ---------------------------------------------------------------------

-- One row, edited on the admin site. The prices live here, not in
-- code, for the same reason the card prices live in Paystack: changing
-- one is an edit, not a release. A plan with no price is not offered
-- by transfer.
create table if not exists public.transfer_settings (
  id              smallint primary key default 1 check (id = 1),
  enabled         boolean not null default false,
  bank_name       text not null default '' check (char_length(bank_name) <= 80),
  account_name    text not null default '' check (char_length(account_name) <= 120),
  -- NUBAN is ten digits; the check allows other banks' formats too.
  account_number  text not null default '' check (account_number ~ '^[0-9]{0,20}$'),
  currency        text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  -- In the currency's minor unit (kobo), like Paystack's amounts.
  price_monthly   bigint check (price_monthly is null or price_monthly between 100 and 100000000),
  price_biannual  bigint check (price_biannual is null or price_biannual between 100 and 100000000),
  price_annual    bigint check (price_annual is null or price_annual between 100 and 100000000),
  updated_at      timestamptz not null default now(),
  updated_by      text
);

insert into public.transfer_settings (id) values (1) on conflict (id) do nothing;

comment on table public.transfer_settings is
  'The bank account and per-plan prices for paying by transfer. One row, edited on the admin site. Service role only.';

-- ---------------------------------------------------------------------
-- Transfers waiting for, or given, a decision
-- ---------------------------------------------------------------------

create table if not exists public.transfers (
  id              text primary key check (id ~ '^trf_[0-9a-f-]{36}$'),
  -- The phone's own id for this submission, stable across retries, so
  -- a response lost on the way back does not queue it twice.
  client_id       text not null unique check (client_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  email           text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  plan            text not null check (plan in ('monthly', 'biannual', 'annual')),
  -- What the plan cost when the receipt was sent, from transfer_settings:
  -- the server's number, never the phone's.
  amount          bigint not null check (amount > 0),
  currency        text not null check (currency ~ '^[A-Z]{3}$'),
  sender_name     text not null check (char_length(sender_name) between 2 and 80),
  paid_on         date not null,
  bank_reference  text check (bank_reference is null or char_length(bank_reference) <= 60),
  -- A path in the private payment-receipts bucket. Null once the image
  -- has been deleted (90 days after the decision).
  receipt_key     text,
  -- SHA-256 of the rebuilt image. One receipt pays once: unique among
  -- transfers that were not rejected (index below), so a member whose
  -- transfer was turned down for a typo can send the same receipt again.
  receipt_sha256  text not null check (receipt_sha256 ~ '^[0-9a-f]{64}$'),
  status          text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     text,
  -- Shown to the member when a transfer is rejected.
  reviewer_note   text check (reviewer_note is null or char_length(reviewer_note) <= 500),
  receipt_deleted_at timestamptz
);

comment on table public.transfers is
  'Bank transfers sent for approval. The receipt image is in the private payment-receipts bucket, never here. Service role only.';

create index if not exists transfers_pending_idx on public.transfers (submitted_at) where status = 'Pending';
create index if not exists transfers_email_idx on public.transfers (email, submitted_at desc);
-- At most one transfer waiting per member: the database decides, not a
-- check the function could race past.
create unique index if not exists transfers_one_pending_idx on public.transfers (email) where status = 'Pending';
create unique index if not exists transfers_receipt_once_idx on public.transfers (receipt_sha256) where status <> 'Rejected';

-- ---------------------------------------------------------------------
-- Payments: say how each was paid
-- ---------------------------------------------------------------------

alter table public.payments
  add column if not exists method text not null default 'paystack' check (method in ('paystack', 'transfer'));

comment on table public.payments is
  'Successful payments: Paystack charges from the webhook, and bank transfers an admin approved; whether each was later refunded or charged back. No card data: Paystack keeps that. Service role only.';

-- ---------------------------------------------------------------------
-- The receipt bucket
-- ---------------------------------------------------------------------

-- Private, and separate from the style photographs: these are financial
-- documents with names and account details on them. An admin reads one
-- through a signed URL that lasts ten minutes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 4194304, array['image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Lock it down
-- ---------------------------------------------------------------------

alter table public.transfer_settings enable row level security;
alter table public.transfer_settings force row level security;
alter table public.transfers enable row level security;
alter table public.transfers force row level security;

revoke all on table public.transfer_settings, public.transfers from anon, authenticated;
grant select, insert, update, delete on table public.transfer_settings, public.transfers to service_role;
