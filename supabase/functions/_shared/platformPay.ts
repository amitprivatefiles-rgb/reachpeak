/**
 * platformPay — shared helper for the PLATFORM-level payment gateway (wallet recharge).
 * The founder's own Razorpay account collects money FROM users into their ReachPeak wallet.
 * Distinct from per-tenant `payment_providers` (merchants' own Razorpay for COD→prepaid).
 *
 * Secrets are stored in Supabase Vault; this module holds only the UUID refs and decrypts
 * on demand via the service-role-only get_vault_secret RPC.
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface PlatformProvider {
  id: string;
  gateway: string;
  key_id: string;
  key_secret: string;          // decrypted
  webhook_secret: string | null; // decrypted (may be null until configured)
  mode: 'live' | 'test';
}

async function decryptVault(db: SupabaseClient, vaultId: string | null): Promise<string | null> {
  if (!vaultId) return null;
  const { data, error } = await db.rpc('get_vault_secret', { secret_id: vaultId });
  if (error) { console.error('[platformPay] vault decrypt error:', error.message); return null; }
  return data;
}

/** Load the active platform gateway config with decrypted secrets (service-role db client). */
export async function getPlatformProvider(
  db: SupabaseClient,
  gateway = 'razorpay',
): Promise<PlatformProvider | null> {
  const { data: prov, error } = await db
    .from('platform_payment_providers')
    .select('id, gateway, key_id, key_secret_enc, webhook_secret_enc, mode, is_active')
    .eq('gateway', gateway)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !prov) return null;

  const key_secret = await decryptVault(db, prov.key_secret_enc);
  if (!key_secret) return null;
  const webhook_secret = await decryptVault(db, prov.webhook_secret_enc);

  return {
    id: prov.id, gateway: prov.gateway, key_id: prov.key_id,
    key_secret, webhook_secret, mode: prov.mode,
  };
}

/** HMAC-SHA256 hex (Razorpay webhook signature). */
export async function hmacSha256Hex(rawBody: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time-ish compare. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
