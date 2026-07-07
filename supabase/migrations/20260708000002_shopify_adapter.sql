-- ============================================================
-- Shopify Adapter — shop_domain column + abandoned checkout cron
-- Fully idempotent — safe to re-run
-- ============================================================

-- 1. Add shop_domain to integration_keys (for Shopify tenant resolution)
alter table integration_keys add column if not exists shop_domain text;
create index if not exists integration_keys_shop_domain_idx
  on integration_keys (shop_domain) where source = 'shopify';

-- 2. Abandoned checkout scan cron (every 15 min)
--    Finds checkout_started events older than 30 min with no matching order_created,
--    synthesizes cart_abandoned events, invokes journey-engine.
select cron.unschedule('scan-abandoned-checkouts')
  where exists (select 1 from cron.job where jobname = 'scan-abandoned-checkouts');

select cron.schedule(
  'scan-abandoned-checkouts',
  '*/15 * * * *',
  $body$
  do $fn$
  declare
    _key text;
    _url text := 'https://mxupzmwznkekdjylaztl.supabase.co/functions/v1/journey-engine';
    _evt record;
    _new_id uuid;
    _count int := 0;
  begin
    -- Read service role key
    select value into _key from internal_config where key = 'service_role_key';
    if _key is null then return; end if;

    -- Find abandoned checkouts: checkout_started > 30 min ago, no order_created with same checkout token
    for _evt in
      select e.id, e.user_id, e.source, e.contact_phone, e.contact_name, e.payload
      from events e
      where e.event_type = 'checkout_started'
        and e.created_at < now() - interval '30 minutes'
        and e.status = 'processed'
        and not exists (
          select 1 from events e2
          where e2.user_id = e.user_id
            and e2.source = e.source
            and e2.event_type = 'order_created'
            and (e2.payload->>'checkout_token') = (e.payload->>'checkout_token')
        )
        and not exists (
          select 1 from events e3
          where e3.user_id = e.user_id
            and e3.source = e.source
            and e3.event_type = 'cart_abandoned'
            and e3.dedupe_key = 'cart_abandoned:' || (e.payload->>'checkout_token')
        )
      limit 50
    loop
      -- Insert cart_abandoned event (idempotent via dedupe_key)
      insert into events (user_id, source, event_type, contact_phone, contact_name, dedupe_key, payload, status)
      values (
        _evt.user_id, _evt.source, 'cart_abandoned', _evt.contact_phone, _evt.contact_name,
        'cart_abandoned:' || (_evt.payload->>'checkout_token'),
        _evt.payload, 'received'
      )
      on conflict (user_id, source, dedupe_key) do nothing
      returning id into _new_id;

      if _new_id is not null then
        -- Invoke journey-engine for the new event
        perform net.http_post(
          url := _url,
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || _key,
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object('event_id', _new_id::text)
        );
        _count := _count + 1;
      end if;
    end loop;

    if _count > 0 then
      raise notice 'scan-abandoned-checkouts: synthesized % cart_abandoned events', _count;
    end if;
  end $fn$;
  $body$
);
