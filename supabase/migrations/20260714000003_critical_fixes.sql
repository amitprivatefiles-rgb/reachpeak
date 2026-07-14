-- ============================================================
-- Fix migration: critical band, callback retry, order identity
-- ============================================================

-- 1. Add order_number (display) column — distinct from external_order_id (UUID identity)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_number text;

-- 2. Callback log table for retry and reconciliation
CREATE TABLE IF NOT EXISTS callback_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callback_id      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  type             text NOT NULL,           -- 'action' or 'message_status'
  payload          jsonb NOT NULL,
  status           text NOT NULL DEFAULT 'pending',  -- pending, delivered, failed_permanent
  attempts         integer NOT NULL DEFAULT 0,
  last_attempt_at  timestamptz,
  next_retry_at    timestamptz,
  acked_at         timestamptz,             -- set when PeakCart ACKs with 200
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS callback_log_unacked_idx
  ON callback_log (user_id, status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS callback_log_callback_id_idx
  ON callback_log (callback_id);

-- RLS
ALTER TABLE callback_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "callback_log_service_role"
  ON callback_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 3. Update orderguard_settings to support 'critical' band threshold
ALTER TABLE orderguard_settings
  ADD COLUMN IF NOT EXISTS critical_min integer NOT NULL DEFAULT 70;
-- critical band: score >= critical_min (default 70-100)
-- So bands are: low (0..low_max), medium (low_max+1..medium_max),
--               high (medium_max+1..critical_min-1), critical (critical_min..100)
