/*
  # Add Processing Status to Campaigns

  ## Changes Made
  1. Drop the existing status check constraint
  2. Add a new check constraint that includes 'Processing' status
     - Allowed values: 'Running', 'Paused', 'Completed', 'Processing'
  
  ## Purpose
  - Allows campaigns to have a 'Processing' status
  - Fixes constraint violation error when creating/updating campaigns with Processing status
  
  ## Important Notes
  - This maintains all existing status values
  - Adds 'Processing' as a valid option for campaign workflow
*/

-- Drop the existing status check constraint
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Add new check constraint that includes 'Processing'
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('Running', 'Paused', 'Completed', 'Processing'));