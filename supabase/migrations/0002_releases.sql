-- Releases: the APK, the over-the-air web bundles, and the manifest that
-- names the newest of each.
--
-- The opposite of the photo bucket in 0001, and deliberately so. Every
-- object in here is meant for anyone who has the app: the APK is what the
-- landing site's download button links to, a bundle is the app's own
-- HTML/JS/CSS, and latest.json is the file every installed copy reads.
-- Nothing in it was supplied by a user, so public costs no one anything.
--
-- Public means *read by URL*, through /storage/v1/object/public/releases/…
-- — which needs no policy. There is still no storage policy for anon or
-- authenticated, so nobody can list, write, replace or delete anything
-- here except the service role, which is what `npm run ota:publish` and
-- `npm run site:release` upload with. That matters more here than anywhere
-- else in the project: whoever can write a bundle into this bucket can put
-- code on every installed phone.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'releases',
  'releases',
  true,
  104857600,  -- 100 MB: the APK is ~7 MB today, and this is a ceiling, not a target
  array[
    'application/vnd.android.package-archive',
    'application/zip',
    'application/json'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Housekeeping for 0001's rate counters.
--
-- 0001 left the schedule as a comment because pg_cron was not known to
-- be enabled. It is available on this project, so the sweep is wired up
-- here rather than left for someone to remember.
-- ---------------------------------------------------------------------

create extension if not exists pg_cron;

-- Idempotent: unschedule any earlier copy before scheduling, so a re-run
-- does not leave two jobs deleting the same rows.
select cron.unschedule(jobid)
  from cron.job
 where jobname = 'prune-rate-counters';

select cron.schedule(
  'prune-rate-counters',
  '0 4 * * *',
  $$select public.prune_rate_counters()$$
);
