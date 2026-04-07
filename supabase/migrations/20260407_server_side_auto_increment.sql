/*
  Server-Side Campaign Auto-Increment via pg_cron + pg_net
  
  This migration sets up a cron job that calls the auto-increment-campaigns
  edge function every minute. The edge function handles the actual incrementing
  logic including interval checks, so calling once per minute is sufficient.
  
  Prerequisites:
  - pg_cron extension must be enabled (Supabase enables this by default)
  - pg_net extension must be enabled (Supabase enables this by default)
  - The auto-increment-campaigns edge function must be deployed
  
  IMPORTANT: Replace <YOUR_SUPABASE_URL> and <YOUR_SERVICE_ROLE_KEY> with your actual values.
*/

-- Enable required extensions (safe to run even if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the auto-increment job to run every minute
SELECT cron.schedule(
  'auto-increment-campaigns',  -- job name
  '* * * * *',                 -- every minute
  $$
  SELECT net.http_post(
    url := '<YOUR_SUPABASE_URL>/functions/v1/auto-increment-campaigns',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Add 'Cancelled' as a valid campaign status if using CHECK constraints
-- (Supabase typically uses text columns without check constraints, so this is a no-op
-- but included for completeness)
-- ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
-- ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
--   CHECK (status IN ('Running', 'Paused', 'Completed', 'Processing', 'pending_approval', 'approved', 'rejected', 'Cancelled'));
