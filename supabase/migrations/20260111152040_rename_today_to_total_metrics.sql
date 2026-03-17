/*
  # Rename Today Metrics to Total Metrics

  1. Changes
    - Rename `numbers_uploaded_today` to `total_numbers_uploaded`
    - Rename `messages_sent_today` to `total_messages_sent`
    - Rename `messages_failed_today` to `total_messages_failed`
  
  2. Notes
    - Updates column names in dashboard_metrics table
    - Preserves all existing data
    - Updates are safe and non-destructive
*/

-- Rename columns in dashboard_metrics table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dashboard_metrics' AND column_name = 'numbers_uploaded_today'
  ) THEN
    ALTER TABLE dashboard_metrics RENAME COLUMN numbers_uploaded_today TO total_numbers_uploaded;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dashboard_metrics' AND column_name = 'messages_sent_today'
  ) THEN
    ALTER TABLE dashboard_metrics RENAME COLUMN messages_sent_today TO total_messages_sent;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dashboard_metrics' AND column_name = 'messages_failed_today'
  ) THEN
    ALTER TABLE dashboard_metrics RENAME COLUMN messages_failed_today TO total_messages_failed;
  END IF;
END $$;