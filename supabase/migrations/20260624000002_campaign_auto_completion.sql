-- Campaign auto-completion trigger
-- When all messages for a campaign are in terminal states (sent/delivered/read/failed),
-- automatically transition the campaign from 'Sending' to 'Completed'.
-- Also syncs messages_sent / messages_failed counters for backward compatibility.

CREATE OR REPLACE FUNCTION check_campaign_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id uuid;
  v_total int;
  v_terminal int;
  v_sent int;
  v_failed int;
BEGIN
  -- Only care about outbound campaign messages changing to terminal states
  v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);
  IF v_campaign_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total and terminal messages for this campaign
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read', 'failed')),
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO v_total, v_terminal, v_sent, v_failed
  FROM messages
  WHERE campaign_id = v_campaign_id;

  -- Only auto-complete if there are messages AND all are terminal
  IF v_total > 0 AND v_total = v_terminal THEN
    UPDATE campaigns
    SET
      status = 'Completed',
      end_time = NOW(),
      messages_sent = v_sent,
      messages_failed = v_failed,
      delivery_percentage = CASE WHEN (v_sent + v_failed) > 0
        THEN ROUND(v_sent::numeric / (v_sent + v_failed)::numeric * 100, 2)
        ELSE 0 END,
      failure_percentage = CASE WHEN (v_sent + v_failed) > 0
        THEN ROUND(v_failed::numeric / (v_sent + v_failed)::numeric * 100, 2)
        ELSE 0 END
    WHERE id = v_campaign_id
      AND status = 'Sending';
    -- Only transitions Sending → Completed. Does NOT touch other statuses.
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire on every message status update for campaign messages
DROP TRIGGER IF EXISTS trg_check_campaign_completion ON messages;
CREATE TRIGGER trg_check_campaign_completion
  AFTER UPDATE OF status ON messages
  FOR EACH ROW
  WHEN (NEW.campaign_id IS NOT NULL AND NEW.status IN ('sent', 'delivered', 'read', 'failed'))
  EXECUTE FUNCTION check_campaign_completion();
