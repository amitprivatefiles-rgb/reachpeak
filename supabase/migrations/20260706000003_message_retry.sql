-- ============================================================
-- Failed-send Retry — columns, auto-retry cron, completion fix
-- ============================================================

-- 1. Per-message retry tracking
alter table messages
  add column if not exists retry_count integer not null default 0;

-- 2. Per-campaign auto-retry config (null = off)
alter table campaigns
  add column if not exists auto_retry_hours integer;

-- 3. Fix check_campaign_completion: count 'cancelled' as terminal.
--    Without this, campaigns with any cancelled messages stay stuck
--    in Sending forever because v_total > v_terminal.
CREATE OR REPLACE FUNCTION check_campaign_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id uuid;
  v_total int;
  v_terminal int;
  v_sent int;
  v_failed int;
BEGIN
  v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);
  IF v_campaign_id IS NULL THEN RETURN NEW; END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read', 'failed', 'cancelled')),
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO v_total, v_terminal, v_sent, v_failed
  FROM messages WHERE campaign_id = v_campaign_id;

  IF v_total > 0 AND v_total = v_terminal THEN
    UPDATE campaigns SET
      status = 'Completed',
      end_time = NOW(),
      messages_sent = v_sent,
      messages_failed = v_failed,
      delivery_percentage = CASE WHEN (v_sent+v_failed)>0
        THEN ROUND(v_sent::numeric/(v_sent+v_failed)::numeric*100,2) ELSE 0 END,
      failure_percentage = CASE WHEN (v_sent+v_failed)>0
        THEN ROUND(v_failed::numeric/(v_sent+v_failed)::numeric*100,2) ELSE 0 END
    WHERE id = v_campaign_id AND status = 'Sending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger to also fire on cancelled status
DROP TRIGGER IF EXISTS trg_check_campaign_completion ON messages;
CREATE TRIGGER trg_check_campaign_completion
  AFTER UPDATE OF status ON messages
  FOR EACH ROW
  WHEN (NEW.campaign_id IS NOT NULL
    AND NEW.status IN ('sent', 'delivered', 'read', 'failed', 'cancelled'))
  EXECUTE FUNCTION check_campaign_completion();

-- 4. RPC for campaign-action edge function to atomically increment retry_count
CREATE OR REPLACE FUNCTION increment_retry_count(message_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE messages
  SET retry_count = retry_count + 1, updated_at = now()
  WHERE id = ANY(message_ids);
$$;

GRANT EXECUTE ON FUNCTION increment_retry_count(uuid[]) TO service_role;

-- 5. pg_cron: auto-retry sweep every 30 minutes
--    Requeues retryable failed messages for campaigns with auto_retry_hours set.
--    Only touches campaigns in Completed or Sending status.
--    Only flips Completed → Sending (never resurrects Cancelled or Paused).
select cron.schedule(
  'auto-retry-failed-messages',
  '*/30 * * * *',
  $$
  with retryable as (
    update messages m
    set status = 'queued',
        claimed_at = null,
        error_code = null,
        error_message = null,
        retry_count = retry_count + 1,
        updated_at = now()
    from campaigns c
    where m.campaign_id = c.id
      and m.status = 'failed'
      and m.wamid is null
      and m.retry_count < 2
      and m.error_code is distinct from '131026'
      and m.error_code is distinct from '131051'
      and m.error_code is distinct from '368'
      and m.error_code is distinct from '131031'
      and (m.error_code is null or m.error_code not like '132%')
      and m.error_code is distinct from '100'
      and c.auto_retry_hours is not null
      and c.status in ('Completed', 'Sending')
      and m.failed_at < now() - (c.auto_retry_hours || ' hours')::interval
    returning m.campaign_id
  )
  update campaigns
  set status = 'Sending', updated_at = now()
  where id in (select distinct campaign_id from retryable)
    and status = 'Completed';
  $$
);
