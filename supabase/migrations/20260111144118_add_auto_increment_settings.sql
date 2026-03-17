/*
  # Add Auto-Increment Settings to Campaigns

  ## Overview
  This migration adds fields to the campaigns table to support automatic increment of sent and failed messages
  for campaigns in Running status. This allows for simulated real-time campaign progress.

  ## 1. Changes to campaigns table
    - `auto_increment_enabled` (boolean) - Whether auto-increment is enabled for this campaign
    - `auto_increment_total` (integer) - Total number of contacts for auto-increment calculation
    - `auto_increment_sent_ratio` (numeric) - Percentage of messages to mark as sent (0-100)
    - `auto_increment_failed_ratio` (numeric) - Percentage of messages to mark as failed (0-100)
    - `auto_increment_interval` (integer) - Interval in seconds between updates (default 5)
    - `last_auto_increment` (timestamptz) - Last time auto-increment was triggered

  ## 2. Security
    - No RLS changes needed, existing policies apply
*/

-- Add auto-increment configuration columns to campaigns table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'auto_increment_enabled'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'auto_increment_total'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_total integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'auto_increment_sent_ratio'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_sent_ratio numeric(5,2) DEFAULT 70.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'auto_increment_failed_ratio'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_failed_ratio numeric(5,2) DEFAULT 30.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'auto_increment_interval'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_interval integer DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'last_auto_increment'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN last_auto_increment timestamptz;
  END IF;
END $$;