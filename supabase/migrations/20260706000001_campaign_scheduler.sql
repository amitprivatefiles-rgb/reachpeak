-- ============================================================
-- Campaign Scheduling — pg_cron release mechanism
-- ============================================================
-- The worker's claim_queued_messages() only claims messages whose
-- campaign is 'Sending' or 'Running'. Scheduling works by enqueuing
-- rows immediately but leaving the campaign at 'approved'. This cron
-- job flips approved→Sending when scheduled_start arrives.

-- Ensure pg_cron is available
create extension if not exists pg_cron;

-- Every minute: release scheduled campaigns whose time has come
select cron.schedule(
  'release-scheduled-campaigns',
  '* * * * *',
  $$update campaigns
      set status = 'Sending', updated_at = now()
    where status = 'approved'
      and scheduled_start is not null
      and scheduled_start <= now()$$
);
