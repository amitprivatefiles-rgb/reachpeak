/*
  # Add Auto-Increment Completion Time

  ## Overview
  This migration adds a field to track when auto-increment should complete and automatically
  mark the campaign as complete with an end time.

  ## 1. Changes to campaigns table
    - `auto_increment_complete_at` (timestamptz) - Target completion time for auto-increment

  ## 2. Security
    - No RLS changes needed, existing policies apply
*/

-- Add auto-increment completion time column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'auto_increment_complete_at'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_complete_at timestamptz;
  END IF;
END $$;