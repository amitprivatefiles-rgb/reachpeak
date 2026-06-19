-- ============================================================
-- Phase 1: Real-time sending — remove simulation, add worker support
-- ============================================================

-- 1. Add 'sending' to messages status CHECK constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_status_check
  CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled'));

-- 2. Drop all auto_increment simulation columns from campaigns
ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_increment_enabled;
ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_increment_total;
ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_increment_sent_ratio;
ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_increment_failed_ratio;
ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_increment_interval;
ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_increment_complete_at;

-- 3. Add whatsapp_account_id to campaigns (nullable — existing campaigns won't have one)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'whatsapp_account_id'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN whatsapp_account_id uuid REFERENCES whatsapp_accounts(id);
  END IF;
END $$;

-- 4. Add template_language column to campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'template_language'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN template_language text DEFAULT 'en_US';
  END IF;
END $$;

-- 5. Expand campaigns status to include 'Sending'
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('Running', 'Paused', 'Completed', 'Processing', 'Sending',
                     'pending_approval', 'approved', 'rejected', 'Cancelled'));

-- 6. Index for worker polling: find queued messages fast
CREATE INDEX IF NOT EXISTS idx_messages_status_created
  ON messages (status, created_at)
  WHERE status IN ('queued', 'sending');

-- 6b. Add claimed_at so we can detect stale 'sending' rows after a worker crash
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN claimed_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_stale_sending
  ON messages (status, claimed_at)
  WHERE status = 'sending';

-- 7. Atomic claim function for the VPS send worker.
--    Uses FOR UPDATE SKIP LOCKED to prevent double-sends across worker instances.
--    Sets claimed_at so stale-claim recovery knows when the claim happened.
--    Only claims messages whose campaign is active (Sending/Running) or non-campaign messages.
CREATE OR REPLACE FUNCTION claim_queued_messages(batch_size integer DEFAULT 50)
RETURNS SETOF messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE messages SET status = 'sending', claimed_at = NOW()
  WHERE id IN (
    SELECT m.id FROM messages m
    LEFT JOIN campaigns c ON m.campaign_id = c.id
    WHERE m.status = 'queued'
      AND (m.campaign_id IS NULL OR c.status IN ('Sending', 'Running'))
    ORDER BY m.created_at
    LIMIT batch_size
    FOR UPDATE OF m SKIP LOCKED
  )
  RETURNING *;
$$;

-- 8. Grant execute to service_role
GRANT EXECUTE ON FUNCTION claim_queued_messages(integer) TO service_role;
