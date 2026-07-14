-- ============================================================
-- Fix: callback-retry cron + COD confirmation journey definition
-- ============================================================

-- 1. Schedule callback-retry to run every minute
SELECT cron.schedule(
  'callback-retry',
  '* * * * *',
  $$
  do $fn$
  declare
    _key text;
    _url text := 'https://mxupzmwznkekdjylaztl.supabase.co/functions/v1/callback-retry';
  begin
    -- Only fire if there are pending callbacks due for retry
    if not exists (
      select 1 from callback_log
      where status = 'pending' and next_retry_at <= now()
    ) then return; end if;

    select value into _key from internal_config where key = 'service_role_key';
    if _key is null then
      raise warning 'callback-retry: service_role_key not set';
      return;
    end if;

    perform net.http_post(
      url := _url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || _key,
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  end $fn$;
  $$
);

-- 2. Insert COD confirmation journey definition (per-tenant, for the active WABA owner)
-- trigger_filters: risk_band must be medium, high, or critical
-- on_reply keys: normalized CONFIRM/CANCEL (not emoji strings)
INSERT INTO journeys (user_id, name, preset, trigger_event, trigger_filters, exit_on_events, steps, is_active)
SELECT
  wa.user_id,
  'COD Confirmation',
  'cod_confirm',
  'cod_pending',
  '{"risk_band": ["medium", "high", "critical"]}'::jsonb,
  '{"order_confirmed", "order_paid", "order_cancelled"}'::text[],
  '[
    {
      "type": "send_buttons",
      "template_id": "cod_confirmation",
      "variable_bindings": {
        "1": "customer_name",
        "2": "order_number",
        "3": "total",
        "4": "store_name"
      },
      "reply_timeout_hours": 6,
      "on_reply": {
        "CONFIRM": [
          { "type": "callback", "action": "order.confirm" }
        ],
        "CANCEL": [
          { "type": "callback", "action": "order.cancel" }
        ]
      },
      "on_timeout": [
        { "type": "callback", "action": "order.confirmation_expired" }
      ]
    }
  ]'::jsonb,
  true
FROM whatsapp_accounts wa
WHERE wa.is_active = true
ON CONFLICT DO NOTHING;
