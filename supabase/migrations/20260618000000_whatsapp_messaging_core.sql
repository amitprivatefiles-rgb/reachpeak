/*
  # WhatsApp Messaging Core — real send + receive layer

  Adds the tables that turn the platform from a simulation into a real
  WhatsApp Cloud API integration. Your existing tables are untouched.

  1. New Tables
    - whatsapp_accounts : per-tenant WABA connection (waba id, phone number id,
                          access token, display name, quality rating, status)
    - templates         : message templates + their Meta approval status
    - messages          : every individual outbound/inbound message with its
                          WhatsApp message id (wamid), status, and cost

  2. Security
    - RLS enabled on all three tables, owner-only (auth.uid() = user_id),
      matching your existing multi-tenancy migration.
    - The webhook + send functions use the SERVICE ROLE, which bypasses RLS.
    - !!! whatsapp_accounts.access_token is a SECRET. The frontend must select
      only non-secret columns (NEVER `select('*')` on this table). Before
      production, move the token into Supabase Vault. Functions read it via
      the service role only.

  3. Indexes
    - messages(wamid) unique  — webhook looks up rows by wamid
    - whatsapp_accounts(phone_number_id) unique — webhook routes inbound by it
*/

-- ============================================================
-- whatsapp_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  waba_id text NOT NULL,
  phone_number_id text NOT NULL,
  access_token text NOT NULL,
  display_phone_number text,
  verified_name text,
  quality_rating text,
  status text NOT NULL DEFAULT 'connected',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_accounts_phone_number_id_key
  ON whatsapp_accounts(phone_number_id);
CREATE INDEX IF NOT EXISTS whatsapp_accounts_user_id_idx
  ON whatsapp_accounts(user_id);

ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select own wa accounts" ON whatsapp_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner insert own wa accounts" ON whatsapp_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update own wa accounts" ON whatsapp_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner delete own wa accounts" ON whatsapp_accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- templates
-- ============================================================
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_account_id uuid REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en_US',
  category text NOT NULL DEFAULT 'marketing',   -- marketing | utility | authentication
  status text NOT NULL DEFAULT 'pending',       -- pending | approved | rejected | paused
  header jsonb,
  body_text text,
  footer text,
  buttons jsonb,
  variables jsonb DEFAULT '[]'::jsonb,
  meta_template_id text,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS templates_user_id_idx ON templates(user_id);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select own templates" ON templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner insert own templates" ON templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update own templates" ON templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner delete own templates" ON templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- messages
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_account_id uuid REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  wamid text,
  direction text NOT NULL DEFAULT 'outbound',   -- outbound | inbound
  wa_from text,
  wa_to text,
  message_type text,                            -- template | text | image | ...
  template_name text,
  content jsonb,
  status text NOT NULL DEFAULT 'queued',        -- queued|sent|delivered|read|failed|received
  conversation_category text,                   -- marketing|utility|authentication|service
  pricing_billable boolean,
  cost numeric(10,4),
  error_code text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS messages_wamid_key
  ON messages(wamid) WHERE wamid IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_user_created_idx
  ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_account_idx ON messages(whatsapp_account_id);
CREATE INDEX IF NOT EXISTS messages_campaign_idx ON messages(campaign_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select own messages" ON messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner insert own messages" ON messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update own messages" ON messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- shared updated_at touch trigger
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_whatsapp_accounts ON whatsapp_accounts;
CREATE TRIGGER touch_whatsapp_accounts BEFORE UPDATE ON whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS touch_templates ON templates;
CREATE TRIGGER touch_templates BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS touch_messages ON messages;
CREATE TRIGGER touch_messages BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
