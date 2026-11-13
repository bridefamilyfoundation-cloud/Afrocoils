-- Every @afrocoils.app address is its own mailbox (2026-11-13).
--
-- Resend receives for the whole domain; until now the inbound function
-- kept only support@ and hello@ and dropped the rest. `mailbox` is now the
-- local part of whichever address was written to, checked against the
-- same pattern as MAILBOX_PATTERN in supabase/functions/_shared/email.ts.

alter table public.support_messages
  drop constraint if exists support_messages_mailbox_check;

alter table public.support_messages
  add constraint support_messages_mailbox_check
  check (mailbox ~ '^[a-z0-9][a-z0-9._-]{0,63}$');

comment on table public.support_messages is
  'Mail to and from any @afrocoils.app address, one mailbox per address. Text only. Service role only.';

create index if not exists support_messages_mailbox_idx
  on public.support_messages (mailbox, created_at desc);
