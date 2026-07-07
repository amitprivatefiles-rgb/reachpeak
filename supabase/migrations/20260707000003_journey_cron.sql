-- ============================================================
-- Journey cron — wake delayed executions via pg_net → journey-engine
-- ============================================================

-- 1. Config table for service-role key (pg_cron SQL can't read env vars)
--    Stored once, used by cron to authenticate pg_net calls to edge functions.
create table if not exists internal_config (
  key   text primary key,
  value text not null
);
-- Lock down: only service_role can read/write
alter table internal_config enable row level security;
-- No RLS policies for authenticated users — only service_role
create policy "internal_config_service_role" on internal_config
  for all to service_role using (true) with check (true);

-- NOTE: After running this migration, you must manually insert the service role key:
--   INSERT INTO internal_config (key, value) VALUES ('service_role_key', 'eyJ...<your key>');
-- This is done ONCE via Supabase SQL Editor (not committed to repo).

-- 2. pg_cron: wake delayed journey executions every minute
--    Uses pg_net http_post to invoke journey-engine with {action:'wake'}
--    Only fires when there are actually due executions (EXISTS guard).
select cron.schedule(
  'wake-journey-executions',
  '* * * * *',
  $$
  do $$
  declare
    _key text;
    _url text := 'https://mxupzmwznkekdjylaztl.supabase.co/functions/v1/journey-engine';
  begin
    -- Only fire if there are due executions
    if not exists (
      select 1 from journey_executions
      where status = 'waiting_delay' and wake_at <= now()
    ) then return; end if;

    -- Read service role key from config
    select value into _key from internal_config where key = 'service_role_key';
    if _key is null then
      raise warning 'wake-journey-executions: service_role_key not set in internal_config';
      return;
    end if;

    -- Fire pg_net POST to journey-engine
    perform net.http_post(
      url := _url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || _key,
        'Content-Type', 'application/json'
      ),
      body := '{"action":"wake"}'::jsonb
    );
  end $$;
  $$
);
