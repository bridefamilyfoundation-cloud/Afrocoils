-- A promotion on card payments (2026-11-27).
--
-- Paystack charges a subscription at its plan's price and has no
-- discount for one. So while a promotion covers card, checkout charges
-- the discounted price as a one-off payment with no plan, and once that
-- payment is believed the server starts the subscription on the same
-- card, its first full-price charge on the day the paid period ends.
--
-- A one-off payment carries no plan code, and Paystack's public key
-- (visible on its checkout page) lets anyone start one on our account
-- with whatever metadata they like. So a planless payment opens a plan
-- only when it matches a row below, which only the billing function
-- writes, at checkout: same reference, same email, at least the amount.
--
-- The privacy policy and Terms were updated in the same change.
--
-- Same posture as every table here: RLS forced, no policies, grants
-- revoked, service role only.

create table if not exists public.card_checkouts (
  reference   text primary key check (char_length(reference) between 1 and 100),
  email       text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  plan        text not null check (plan in ('monthly', 'biannual', 'annual')),
  -- What this checkout asked for, in kobo, after the promotion.
  amount      bigint not null check (amount > 0),
  currency    text not null check (currency ~ '^[A-Z]{3}$'),
  -- "Black Friday, 20% off".
  promo       text not null check (char_length(promo) <= 100),
  created_at  timestamptz not null default now()
);

comment on table public.card_checkouts is
  'Discounted card checkouts the billing function started: the only planless Paystack payments that open a plan. Service role only.';

create index if not exists card_checkouts_email_idx on public.card_checkouts (email, created_at desc);

-- What a payment was discounted by, and the subscription a promotional
-- first payment led to. `renewal_claimed_at` is the compare-and-set that
-- makes sure one payment starts at most one subscription, however many
-- times the webhook and the status check both see it.
alter table public.payments
  add column if not exists promo               text check (promo is null or char_length(promo) <= 100),
  add column if not exists renewal_claimed_at  timestamptz,
  add column if not exists renewal_subscription text;

-- Card is now part of a promotion when the admin says so.
alter table public.transfer_settings
  add column if not exists promo_card boolean not null default false;

alter table public.card_checkouts enable row level security;
alter table public.card_checkouts force row level security;
revoke all on table public.card_checkouts from anon, authenticated;
grant select, insert, update, delete on table public.card_checkouts to service_role;
