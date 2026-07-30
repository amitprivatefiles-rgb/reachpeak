-- ============================================================
-- Journey Intelligence Layer — schema additions
-- Fully idempotent — safe to re-run.
-- ============================================================

-- 1. Add opted_out_at timestamp to contacts (when the opt-out happened)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS opted_out_at timestamptz;

-- 2. Add human_active_until to conversations
--    Set when a customer sends free-text or an agent manually replies.
--    Journey sends defer while this timestamp is in the future.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS human_active_until timestamptz;

-- 3. Automation settings — per-tenant frequency caps
CREATE TABLE IF NOT EXISTS automation_settings (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  max_msgs_per_day  integer NOT NULL DEFAULT 3,
  max_msgs_per_week integer NOT NULL DEFAULT 8,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_automation_settings" ON automation_settings;
CREATE POLICY "own_automation_settings" ON automation_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "automation_settings_service_role" ON automation_settings;
CREATE POLICY "automation_settings_service_role" ON automation_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Add respects_quiet_hours to journeys
--    Default true. Set false for transactional/urgent journeys (e.g. OTP).
ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS respects_quiet_hours boolean NOT NULL DEFAULT true;

-- 5. Add cancel_reason to journey_executions
--    Records WHY an execution was cancelled/aborted (opted_out, defer_expired, etc.)
ALTER TABLE journey_executions
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- 6. Add total_deferred_minutes for defer-expiry tracking
--    Accumulates total minutes an execution has been deferred.
--    If > 7 days (10080 min), the gate aborts with 'defer_expired'.
ALTER TABLE journey_executions
  ADD COLUMN IF NOT EXISTS total_deferred_minutes integer NOT NULL DEFAULT 0;

-- 7. Index for frequency cap queries (journey messages per contact in time window)
CREATE INDEX IF NOT EXISTS idx_messages_journey_contact_time
  ON messages (user_id, wa_to, created_at)
  WHERE journey_execution_id IS NOT NULL;
