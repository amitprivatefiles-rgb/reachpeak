-- ============================================================
-- Schema additions for partner-send, callbacks, tracking, and quality
-- ============================================================

-- 1. Idempotency key on messages (partner-send dedup)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS messages_idempotency_key_idx
  ON messages (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. External reference (links message back to PeakCart order/entity)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS external_type text;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS external_store_ref text;

CREATE INDEX IF NOT EXISTS messages_external_ref_idx
  ON messages (external_type, external_id)
  WHERE external_id IS NOT NULL;

-- 3. Error bucket (actionable failure classification)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS error_bucket text;

-- 4. Messaging limit tier on whatsapp_accounts
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS messaging_limit_tier text;

-- 5. Dry-run flag on messages (for sandbox testing)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_dry_run boolean NOT NULL DEFAULT false;

-- 6. Quality auto-pause: when quality drops to yellow/red,
--    marketing sends are paused for the WABA.
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS marketing_paused boolean NOT NULL DEFAULT false;
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS marketing_paused_reason text;

-- 7. Quiet hours config on orderguard_settings
ALTER TABLE orderguard_settings
  ADD COLUMN IF NOT EXISTS quiet_hours_start time;
ALTER TABLE orderguard_settings
  ADD COLUMN IF NOT EXISTS quiet_hours_end time;
ALTER TABLE orderguard_settings
  ADD COLUMN IF NOT EXISTS quiet_hours_tz text NOT NULL DEFAULT 'Asia/Kolkata';

-- 8. Cost config table (per-conversation-category pricing, configurable)
CREATE TABLE IF NOT EXISTS messaging_cost_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  cost_inr numeric(10,4) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed current Meta India rates (per delivered template message, July 2025+)
INSERT INTO messaging_cost_config (category, cost_inr) VALUES
  ('utility', 0.1400),
  ('marketing', 0.8600),
  ('authentication', 0.0400),
  ('service', 0.0000)
ON CONFLICT (category) DO NOTHING;

-- RLS: only service_role can read/write cost config
ALTER TABLE messaging_cost_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_config_service_role"
  ON messaging_cost_config FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
