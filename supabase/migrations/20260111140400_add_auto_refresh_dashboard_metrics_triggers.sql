/*
  # Auto-Refresh Dashboard Metrics Triggers

  ## Changes Made
  1. Create triggers to automatically refresh dashboard metrics in real-time
  2. Triggers fire when campaigns or contacts are modified
  3. Ensures dashboard always shows aggregated data from ALL campaigns
  
  ## Purpose
  - Automatically updates dashboard_metrics when any campaign data changes
  - Aggregates metrics from ALL campaigns in real-time
  - Eliminates manual refresh requirements for multi-campaign scenarios
  
  ## Important Notes
  - Triggers call refresh_dashboard_metrics() automatically
  - Works for all INSERT, UPDATE, DELETE operations
  - Ensures accurate multi-campaign data aggregation
  - Dashboard metrics always reflect current state of ALL campaigns
*/

-- Function to trigger dashboard metrics refresh
CREATE OR REPLACE FUNCTION trigger_refresh_dashboard_metrics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_dashboard_metrics();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_campaigns_refresh_metrics ON campaigns;
DROP TRIGGER IF EXISTS trigger_contacts_refresh_metrics ON contacts;

-- Trigger on campaigns table to refresh dashboard metrics
CREATE TRIGGER trigger_campaigns_refresh_metrics
  AFTER INSERT OR UPDATE OR DELETE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_dashboard_metrics();

-- Trigger on contacts table to refresh dashboard metrics
CREATE TRIGGER trigger_contacts_refresh_metrics
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_dashboard_metrics();

-- Initial refresh to sync all current data
SELECT refresh_dashboard_metrics();
