/*
  # Fix Dashboard Metrics Trigger Column Names

  1. Changes Made
    - Update refresh_dashboard_metrics() function to use correct column names
    - Replace old column names (numbers_uploaded_today, messages_sent_today, messages_failed_today)
    - Use new column names (total_numbers_uploaded, total_messages_sent, total_messages_failed)
  
  2. Purpose
    - Fix error when saving campaigns due to non-existent column references
    - Ensure triggers work correctly with renamed columns
    - Allow admin to edit campaigns without database errors
  
  3. Important Notes
    - This fixes the trigger that runs on every campaign update
    - Columns were renamed in migration 20260111152040_rename_today_to_total_metrics.sql
    - Function now uses correct column names matching current schema
*/

-- Drop and recreate the refresh_dashboard_metrics function with correct column names
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
  SELECT COUNT(*) INTO v_total_contacts FROM contacts;
  SELECT COUNT(*) INTO v_unassigned_contacts FROM contacts WHERE campaign_id IS NULL;
  SELECT COUNT(*) INTO v_active_campaigns FROM campaigns WHERE status = 'Running';
  SELECT COUNT(*) INTO v_completed_campaigns FROM campaigns WHERE status = 'Completed';
  SELECT COUNT(*) INTO v_blacklisted FROM contacts WHERE is_blacklisted = true;
  SELECT COUNT(*) INTO v_active_agents FROM agents WHERE is_active = true;
  
  INSERT INTO dashboard_metrics (
    metric_date,
    total_contacts,
    total_numbers_uploaded,
    total_messages_sent,
    total_messages_failed,
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
    COALESCE((SELECT total_numbers_uploaded FROM dashboard_metrics WHERE metric_date = v_today), 0),
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
    total_messages_sent = EXCLUDED.total_messages_sent,
    total_messages_failed = EXCLUDED.total_messages_failed,
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