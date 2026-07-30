-- ============================================================
-- Shopify Connect Schema — hardened integration_keys + Vault
-- Fully idempotent.
-- ============================================================

-- 1. Add provider_secret_enc (Vault UUID) to integration_keys
ALTER TABLE integration_keys
  ADD COLUMN IF NOT EXISTS provider_secret_enc uuid;

-- 2. Add last_event_at for health tracking
ALTER TABLE integration_keys
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;

-- 3. Add connection_status for health card
-- Values: 'pending', 'healthy', 'error', 'stale'
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_keys' AND column_name = 'connection_status'
  ) THEN
    ALTER TABLE integration_keys ADD COLUMN connection_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- 4. Unique constraint on shop_domain for active shopify keys
-- (multi-tenant safety: one store can map to only one tenant)
DROP INDEX IF EXISTS integration_keys_shop_domain_unique;
CREATE UNIQUE INDEX integration_keys_shop_domain_unique
  ON integration_keys (shop_domain)
  WHERE source = 'shopify' AND is_active = true;

-- 5. Vault RPCs for provider_secret (same pattern as WABA tokens)
CREATE OR REPLACE FUNCTION get_provider_secret(p_key_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_id uuid;
  plain text;
BEGIN
  SELECT provider_secret_enc, provider_secret
  INTO enc_id, plain
  FROM integration_keys WHERE id = p_key_id;

  IF enc_id IS NOT NULL THEN
    RETURN get_vault_secret(enc_id);
  END IF;

  -- Fallback to plaintext during migration period
  IF plain IS NOT NULL AND plain != '' THEN
    RETURN plain;
  END IF;

  RAISE WARNING 'get_provider_secret: no secret for key %', p_key_id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION set_provider_secret(p_key_id uuid, p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vault_id uuid;
BEGIN
  SELECT store_vault_secret(
    p_secret,
    'provider_secret_' || p_key_id::text
  ) INTO vault_id;

  UPDATE integration_keys
  SET provider_secret_enc = vault_id,
      provider_secret = NULL
  WHERE id = p_key_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_provider_secret(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION get_provider_secret(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION get_provider_secret(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION set_provider_secret(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION set_provider_secret(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION set_provider_secret(uuid, text) FROM authenticated;

-- 6. Migrate existing plaintext provider_secrets to Vault
DO $$
DECLARE
  r RECORD;
  vault_id uuid;
BEGIN
  FOR r IN
    SELECT id, provider_secret
    FROM integration_keys
    WHERE provider_secret IS NOT NULL
      AND provider_secret != ''
      AND provider_secret_enc IS NULL
  LOOP
    SELECT store_vault_secret(
      r.provider_secret,
      'provider_secret_' || r.id::text
    ) INTO vault_id;

    UPDATE integration_keys
    SET provider_secret_enc = vault_id,
        provider_secret = NULL
    WHERE id = r.id;

    RAISE NOTICE 'Vault-ified provider_secret for key %', r.id;
  END LOOP;
END $$;

-- 7. Extend events.event_type CHECK to include checkout_started and cart_abandoned
-- (idempotent: drop + re-add)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE events ADD CONSTRAINT events_event_type_check CHECK (event_type IN (
  'cart_abandoned','checkout_started','order_created','order_paid',
  'order_shipped','order_delivered','order_cancelled',
  'customer_created','customer_updated',
  'order_confirmed','order_rto','order_returned','order_refunded','prepay_nudge',
  'cod_pending'
));
