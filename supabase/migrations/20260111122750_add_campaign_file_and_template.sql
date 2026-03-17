/*
  # Add File and Message Template to Campaigns

  1. Schema Changes
    - Add `file_url` column to store uploaded file URL
    - Add `file_name` column to store original file name
    - Add `message_template` column to store campaign message

  2. Purpose
    - Allows admins to upload files (Excel/CSV) with contact data
    - Allows admins to define message templates for campaigns
    - Users can view and download files in real-time
*/

-- Add columns to campaigns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN file_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN file_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'message_template'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN message_template text;
  END IF;
END $$;