-- Close the counter functions to everyone but the service role.
--
-- 0001 revoked EXECUTE from PUBLIC and assumed that was enough. It is not
-- on Supabase: the platform's default privileges grant EXECUTE on every
-- new function in `public` *directly* to anon and authenticated, and a
-- revoke from PUBLIC does not touch a direct grant. Verified on the live
-- project after 0001 ran: both functions were executable by anon.
--
-- That mattered because both are SECURITY DEFINER and reachable through
-- PostgREST's /rpc. Anyone with the project's public key could call
-- incr_rate_counter('rl:submissions:day:<today>', …) five hundred times
-- and the daily cap would refuse every genuine submission until midnight
-- UTC — the limiter turned into the denial of service it exists to stop.
-- prune_rate_counters could be called too (harmless, but not theirs).
--
-- The submissions function calls these with the service key, which keeps
-- its grant below.

revoke execute on function public.incr_rate_counter(text, integer) from anon, authenticated;
revoke execute on function public.prune_rate_counters() from anon, authenticated;

grant execute on function public.incr_rate_counter(text, integer) to service_role;
grant execute on function public.prune_rate_counters() to service_role;

-- And for whatever is created here next, so the next function is closed
-- by default instead of by remembering. Scoped to functions this role
-- creates in `public`; tables keep their explicit revokes in 0001.
alter default privileges in schema public
  revoke execute on functions from anon, authenticated;
