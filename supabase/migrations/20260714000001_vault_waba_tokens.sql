-- ============================================================
-- Vault Migration for whatsapp_accounts.access_token
-- Phase A: Add vault reference, migrate existing tokens,
--          create helper RPC. Keep plaintext as fallback.
--
-- IMPORTANT: Run on a branch database first, NOT production.
-- Uses existing get_vault_secret() / store_vault_secret() RPCs
-- from 20260708000003_payments_core.sql
-- ============================================================

-- 1. Add vault reference column (idempotent)
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS access_token_enc uuid;

-- 2. Migrate existing plaintext tokens into vault
DO $$
DECLARE
  r RECORD;
  vault_id uuid;
BEGIN
  FOR r IN
    SELECT id, access_token
    FROM whatsapp_accounts
    WHERE access_token IS NOT NULL
      AND access_token != ''
      AND access_token NOT LIKE '***%'
      AND access_token_enc IS NULL
  LOOP
    SELECT store_vault_secret(
      r.access_token,
      'waba_token_' || r.id::text
    ) INTO vault_id;

    UPDATE whatsapp_accounts
    SET access_token_enc = vault_id
    WHERE id = r.id;

    RAISE NOTICE 'Migrated token for account %', r.id;
  END LOOP;
END $$;

-- 3. Helper RPC: decrypt a WABA token by account ID
--    Falls back to plaintext column during transition period.
--    Service-role only — never callable from frontend.
CREATE OR REPLACE FUNCTION get_waba_access_token(p_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_id uuid;
  plain text;
BEGIN
  SELECT access_token_enc, access_token
  INTO enc_id, plain
  FROM whatsapp_accounts
  WHERE id = p_account_id;

  -- Prefer vault; fall back to plaintext during transition
  IF enc_id IS NOT NULL THEN
    RETURN get_vault_secret(enc_id);
  END IF;

  RETURN plain;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_waba_access_token(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION get_waba_access_token(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION get_waba_access_token(uuid) FROM authenticated;

-- 4. Helper RPC: store a WABA token in vault and set the enc column.
--    Used by embedded-signup-exchange and save-whatsapp-account.
CREATE OR REPLACE FUNCTION set_waba_access_token(p_account_id uuid, p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vault_id uuid;
  old_enc uuid;
BEGIN
  -- Check for existing vault entry to avoid orphans
  SELECT access_token_enc INTO old_enc
  FROM whatsapp_accounts
  WHERE id = p_account_id;

  -- Store new token in vault
  SELECT store_vault_secret(
    p_token,
    'waba_token_' || p_account_id::text
  ) INTO vault_id;

  -- Update the account row
  UPDATE whatsapp_accounts
  SET access_token_enc = vault_id,
      access_token = '***VAULT***',
      updated_at = NOW()
  WHERE id = p_account_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_waba_access_token(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION set_waba_access_token(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION set_waba_access_token(uuid, text) FROM authenticated;

-- 5. Add blacklist_reason column for §Q2 (hard bounce vs opt-out distinction)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS blacklist_reason text;
-- Allowed: 'opt_out', 'hard_bounce', 'admin', null
