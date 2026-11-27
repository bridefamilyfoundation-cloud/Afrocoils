-- Server-side sessions (2026-11-25).
--
-- Until now a sign-in was a 180-day signed token and nothing else: the
-- server could not end one, so "sign out" only forgot it on the phone.
-- Now every sign-in is a row here. The phone holds a short-lived access
-- token (fifteen minutes, naming this row) and a refresh token whose
-- hash is stored here and replaced on every use. Signing out sets
-- `revoked_at`, which every authenticated route checks, so it takes
-- effect on the server at once.
--
-- `previous_hash` is the refresh token just replaced. Presenting it again
-- within two minutes is a retry after a lost response and is answered;
-- later, it is a copied token being replayed, and the session is revoked
-- (supabase/functions/_shared/sessions.ts).

create table if not exists public.sessions (
  id             uuid primary key default gen_random_uuid(),
  email          text not null check (email = lower(btrim(email))),
  kind           text not null check (kind in ('member', 'admin')),
  refresh_hash   text not null,
  previous_hash  text,
  rotated_at     timestamptz,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  revoked_at     timestamptz
);

comment on table public.sessions is
  'One row per sign-in. Refresh tokens are stored only as an HMAC. Service role only.';

create index if not exists sessions_email_idx on public.sessions (email, kind);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

alter table public.sessions enable row level security;
alter table public.sessions force row level security;
revoke all on table public.sessions from anon, authenticated;
grant select, insert, update, delete on table public.sessions to service_role;
