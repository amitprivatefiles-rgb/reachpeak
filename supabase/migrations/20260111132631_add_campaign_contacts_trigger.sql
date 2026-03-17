/*
  # Add Campaign Contacts Auto-Update Trigger

  ## Changes Made
  1. Create a function to update campaign total_numbers when contacts are added/removed
  2. Create triggers on contacts table to automatically update campaign metrics
  
  ## Purpose
  - Automatically updates campaign.total_numbers when contacts are assigned to a campaign
  - Keeps campaign metrics in sync with contact data in real-time
  - Ensures dashboard displays accurate campaign statistics
  
  ## Important Notes
  - Triggers fire on INSERT, UPDATE, and DELETE of contacts
  - Updates both old and new campaign_id when contacts are reassigned
  - Calculates total_numbers by counting contacts assigned to each campaign
*/

-- Function to update campaign total_numbers
CREATE OR REPLACE FUNCTION update_campaign_total_numbers()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the new campaign (if contact was inserted or campaign_id changed)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.campaign_id IS NOT NULL THEN
    UPDATE campaigns
    SET total_numbers = (
      SELECT COUNT(*) FROM contacts WHERE campaign_id = NEW.campaign_id
    )
    WHERE id = NEW.campaign_id;
  END IF;
  
  -- Update the old campaign (if contact was deleted or campaign_id changed)
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.campaign_id IS NOT NULL THEN
    UPDATE campaigns
    SET total_numbers = (
      SELECT COUNT(*) FROM contacts WHERE campaign_id = OLD.campaign_id
    )
    WHERE id = OLD.campaign_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_campaign_total_numbers ON contacts;

-- Create trigger on contacts table
CREATE TRIGGER trigger_update_campaign_total_numbers
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_total_numbers();