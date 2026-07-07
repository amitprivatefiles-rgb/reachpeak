// Supabase Edge Function: save-payment-provider
// JWT-verified — called from Settings → Payments UI.
// Receives raw secrets, stores them in Vault via store_vault_secret RPC,
// saves vault UUIDs in payment_providers. Never returns secrets.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();

    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const userId = user.id;

    // Service-role client for Vault + DB operations
    const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { key_id, key_secret, webhook_secret, mode } = body;

    if (!key_id || !key_secret) {
      return json({ error: 'key_id and key_secret are required' }, 400);
    }
    if (mode && !['live', 'test'].includes(mode)) {
      return json({ error: 'mode must be "live" or "test"' }, 400);
    }

    // Store key_secret in Vault
    const { data: keyVaultId, error: keyErr } = await db.rpc('store_vault_secret', {
      p_secret: key_secret,
      p_name: `rzp_key_${userId}_${Date.now()}`,
    });
    if (keyErr || !keyVaultId) {
      console.error('[save-payment-provider] Vault key store error:', keyErr?.message);
      return json({ error: 'Failed to store key secret securely' }, 500);
    }

    // Store webhook_secret in Vault (if provided)
    let webhookVaultId: string | null = null;
    if (webhook_secret) {
      const { data: whId, error: whErr } = await db.rpc('store_vault_secret', {
        p_secret: webhook_secret,
        p_name: `rzp_webhook_${userId}_${Date.now()}`,
      });
      if (whErr || !whId) {
        console.error('[save-payment-provider] Vault webhook store error:', whErr?.message);
        return json({ error: 'Failed to store webhook secret securely' }, 500);
      }
      webhookVaultId = whId;
    }

    // Upsert payment_providers
    const providerData: Record<string, any> = {
      user_id: userId,
      provider: 'razorpay',
      key_id,
      key_secret_enc: keyVaultId,
      mode: mode || 'live',
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    if (webhookVaultId) {
      providerData.webhook_secret_enc = webhookVaultId;
    }

    const { data: existing } = await db.from('payment_providers')
      .select('id').eq('user_id', userId).eq('provider', 'razorpay').maybeSingle();

    if (existing) {
      await db.from('payment_providers').update(providerData).eq('id', existing.id);
    } else {
      providerData.created_at = new Date().toISOString();
      if (!webhookVaultId) providerData.webhook_secret_enc = null;
      await db.from('payment_providers').insert(providerData);
    }

    console.log(`[save-payment-provider] Saved for user=${userId} mode=${mode || 'live'}`);
    return json({
      ok: true,
      webhook_url: `${SUPABASE_URL}/functions/v1/razorpay-webhook?u=${userId}`,
    });

  } catch (err: any) {
    console.error('[save-payment-provider] Error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
