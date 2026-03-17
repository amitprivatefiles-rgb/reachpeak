/*
  # Sync Dashboard Metrics and Campaign Data

  ## Changes Made
  1. Create function to refresh dashboard metrics with actual data
  2. Update all campaigns with correct total_numbers based on assigned contacts
  3. Refresh today's dashboard_metrics with current database counts
  
  ## Purpose
  - Ensures dashboard displays accurate data from database
  - Syncs campaign total_numbers with actual contact counts
  - Initializes metrics for campaigns and contacts that were uploaded previously
  
  ## Important Notes
  - This migration syncs all existing data
  - Updates dashboard_metrics for today's date
  - Can be used as a one-time sync or run periodically
*/

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_total_contacts integer;
  v_unassigned_contacts integer;
  v_active_campaigns integer;
  v_completed_campaigns integer;
  v_blacklisted integer;
  v_active_agents integer;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO v_total_contacts FROM contacts;
  SELECT COUNT(*) INTO v_unassigned_contacts FROM contacts WHERE campaign_id IS NULL;
  SELECT COUNT(*) INTO v_active_campaigns FROM campaigns WHERE status = 'Running';
  SELECT COUNT(*) INTO v_completed_campaigns FROM campaigns WHERE status = 'Completed';
  SELECT COUNT(*) INTO v_blacklisted FROM contacts WHERE is_blacklisted = true;
  SELECT COUNT(*) INTO v_active_agents FROM agents WHERE is_active = true;
  
  -- Upsert today's metrics
  INSERT INTO dashboard_metrics (
    metric_date,
    total_contacts,
    numbers_uploaded_today,
    messages_sent_today,
    messages_failed_today,
    messages_pending_retry,
    active_campaigns,
    completed_campaigns,
    delivery_rate,
    failure_rate,
    blacklisted_numbers,
    active_agents,
    last_upload_time
  ) VALUES (
    v_today,
    v_total_contacts,
    COALESCE((SELECT numbers_uploaded_today FROM dashboard_metrics WHERE metric_date = v_today), 0),
    COALESCE((SELECT SUM(messages_sent) FROM campaigns), 0),
    COALESCE((SELECT SUM(messages_failed) FROM campaigns), 0),
    COALESCE((SELECT SUM(pending_retry) FROM campaigns), 0),
    v_active_campaigns,
    v_completed_campaigns,
    CASE 
      WHEN (SELECT SUM(messages_sent + messages_failed) FROM campaigns) > 0 
      THEN (SELECT SUM(messages_sent)::numeric / NULLIF(SUM(messages_sent + messages_failed), 0) * 100 FROM campaigns)
      ELSE 0 
    END,
    CASE 
      WHEN (SELECT SUM(messages_sent + messages_failed) FROM campaigns) > 0 
      THEN (SELECT SUM(messages_failed)::numeric / NULLIF(SUM(messages_sent + messages_failed), 0) * 100 FROM campaigns)
      ELSE 0 
    END,
    v_blacklisted,
    v_active_agents,
    COALESCE((SELECT last_upload_time FROM dashboard_metrics WHERE metric_date = v_today), NOW())
  )
  ON CONFLICT (metric_date) 
  DO UPDATE SET
    total_contacts = EXCLUDED.total_contacts,
    messages_sent_today = EXCLUDED.messages_sent_today,
    messages_failed_today = EXCLUDED.messages_failed_today,
    messages_pending_retry = EXCLUDED.messages_pending_retry,
    active_campaigns = EXCLUDED.active_campaigns,
    completed_campaigns = EXCLUDED.completed_campaigns,
    delivery_rate = EXCLUDED.delivery_rate,
    failure_rate = EXCLUDED.failure_rate,
    blacklisted_numbers = EXCLUDED.blacklisted_numbers,
    active_agents = EXCLUDED.active_agents,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Update all campaigns with correct total_numbers
UPDATE campaigns c
SET total_numbers = (
  SELECT COUNT(*) 
  FROM contacts 
  WHERE campaign_id = c.id
);

-- Refresh today's dashboard metrics
SELECT refresh_dashboard_metrics();