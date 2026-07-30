-- ============================================================
-- Vault WABA Token Deploy + Verify
-- Paste this into the Supabase SQL Editor and run.
-- Fully idempotent — safe to re-run.
-- ============================================================

-- 1. Ensure the enc column exists
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS access_token_enc uuid;

-- 2. Migrate any remaining plaintext tokens into Vault
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
    SET access_token_enc = vault_id,
        access_token = NULL
    WHERE id = r.id;

    RAISE NOTICE 'Migrated and nulled token for account %', r.id;
  END LOOP;
END $$;

-- 3. NULL any remaining plaintext (including '***VAULT***' markers)
-- These are accounts that were already vault-ified but still have a non-null access_token
UPDATE whatsapp_accounts
SET access_token = NULL
WHERE access_token IS NOT NULL
  AND access_token_enc IS NOT NULL;

-- 4. Create/replace the reader RPC (reads from Vault ONLY — no plaintext fallback)
CREATE OR REPLACE FUNCTION get_waba_access_token(p_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_id uuid;
BEGIN
  SELECT access_token_enc INTO enc_id
  FROM whatsapp_accounts
  WHERE id = p_account_id;

  IF enc_id IS NULL THEN
    RAISE WARNING 'get_waba_access_token: no vault entry for account %', p_account_id;
    RETURN NULL;
  END IF;

  RETURN get_vault_secret(enc_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_waba_access_token(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION get_waba_access_token(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION get_waba_access_token(uuid) FROM authenticated;

-- 5. Create/replace the writer RPC
CREATE OR REPLACE FUNCTION set_waba_access_token(p_account_id uuid, p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vault_id uuid;
BEGIN
  SELECT store_vault_secret(
    p_token,
    'waba_token_' || p_account_id::text
  ) INTO vault_id;

  UPDATE whatsapp_accounts
  SET access_token_enc = vault_id,
      access_token = NULL,
      updated_at = NOW()
  WHERE id = p_account_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_waba_access_token(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION set_waba_access_token(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION set_waba_access_token(uuid, text) FROM authenticated;

-- 6. Verification queries (run after migration)
-- Should return 0:
SELECT count(*) AS plaintext_tokens_remaining
FROM whatsapp_accounts
WHERE access_token IS NOT NULL;

-- Should show all active accounts have vault refs:
SELECT id, is_active, 
  access_token IS NULL AS token_nulled,
  access_token_enc IS NOT NULL AS has_vault_ref
FROM whatsapp_accounts;
