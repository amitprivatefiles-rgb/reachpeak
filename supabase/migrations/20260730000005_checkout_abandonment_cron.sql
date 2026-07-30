-- ============================================================
-- Abandoned Checkout Scanner
-- Synthesizes cart_abandoned events from stale checkout_started events.
-- If no order_created arrives for the same contact within 30 min,
-- the checkout is considered abandoned.
--
-- Uses pg_net to call the checkout-scan edge function (which runs
-- events through the full pipeline including journey-engine).
-- Raw DB INSERT alone would NOT trigger journeys.
-- ============================================================

-- 1. DB function to find and INSERT abandoned checkout events
--    Returns the IDs of newly-created events so the edge function
--    can trigger journey-engine for each one.
CREATE OR REPLACE FUNCTION scan_abandoned_checkouts()
RETURNS TABLE(event_id uuid, user_id uuid, contact_phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT e.id, e.user_id, e.contact_phone, e.payload, e.source
    FROM events e
    WHERE e.event_type = 'checkout_started'
      AND e.created_at < NOW() - INTERVAL '30 minutes'
      AND e.created_at > NOW() - INTERVAL '24 hours'
      AND e.status = 'processed'
      AND NOT EXISTS (
        SELECT 1 FROM events e2
        WHERE e2.user_id = e.user_id
          AND e2.contact_phone = e.contact_phone
          AND e2.event_type IN ('order_created', 'order_paid', 'cart_abandoned')
          AND e2.source = e.source
          AND e2.created_at > e.created_at
          AND e2.created_at < e.created_at + INTERVAL '24 hours'
      )
  ),
  inserted AS (
    INSERT INTO events (user_id, contact_phone, event_type, source, payload, status, dedupe_key)
    SELECT
      c.user_id,
      c.contact_phone,
      'cart_abandoned',
      c.source,
      c.payload || jsonb_build_object('synthesized', true, 'checkout_at', NOW()),
      'pending',
      -- Use checkout_token if available, fall back to source event ID (guaranteed unique)
      'cart_abandoned:' || COALESCE(c.payload->>'checkout_token', c.id::text)
    FROM candidates c
    ON CONFLICT (user_id, source, dedupe_key) DO NOTHING
    RETURNING id, events.user_id, events.contact_phone
  )
  SELECT inserted.id AS event_id, inserted.user_id, inserted.contact_phone
  FROM inserted;
END;
$$;

-- 2. pg_cron: call the checkout-scan edge function every 5 minutes via pg_net
-- The edge function runs scan_abandoned_checkouts() AND triggers journey-engine
-- for each synthesized event (a raw INSERT does not trigger journeys).
SELECT cron.schedule(
  'scan-abandoned-checkouts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/checkout-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
