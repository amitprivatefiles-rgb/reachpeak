/*
  # Embedded Signup support (additive)
  Adds business_id + onboarding provenance to whatsapp_accounts.
  The Business Integration System User token returned by the flow is stored
  in the EXISTING access_token column, so the send-worker uses it unchanged.
  No table is dropped or rewritten.
*/

ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS business_id        text,
  ADD COLUMN IF NOT EXISTS onboarded_via      text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_registered_at timestamptz;

-- access_token holds a non-expiring Business Integration System User token
-- after Embedded Signup. It remains a SECRET: frontend must never select it.
