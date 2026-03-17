-- Enable pg_net extension for HTTP calls from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to send emails via Resend API
-- Called from the notification service via supabase.rpc()
CREATE OR REPLACE FUNCTION send_email_via_resend(
  recipient TEXT,
  email_subject TEXT,
  email_html TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resend_api_key TEXT := 're_du4bs6q5_N6YWoS2pmwCq4DDQp6NNE7DK';
  request_id BIGINT;
BEGIN
  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'ReachPeak <onboarding@resend.dev>',
      'to', ARRAY[recipient],
      'subject', email_subject,
      'html', email_html
    )
  ) INTO request_id;
END;
$$;

-- Grant execute to authenticated users (admin will call this)
GRANT EXECUTE ON FUNCTION send_email_via_resend TO authenticated;
