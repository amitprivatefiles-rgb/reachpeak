// Supabase Edge Function: save-shopify-connection
// JWT-authenticated. Saves a Shopify store connection:
//   - Validates shop_domain format
//   - Upserts integration_keys row with source='shopify'
//   - Stores signing secret in Vault
//   - Returns the integration key ID
//
// Deploy: supabase functions deploy save-shopify-connection

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authorization required' }, 401);
    const { data: { user }, error: authErr } =
      await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    // 2. Parse input
    const { shop_domain, signing_secret } = await req.json();
    if (!shop_domain || !signing_secret) {
      return json({ error: 'shop_domain and signing_secret are required' }, 400);
    }

    // 3. Validate shop_domain format
    const domainClean = shop_domain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domainClean)) {
      return json({ error: 'Invalid Shopify domain. Expected format: yourstore.myshopify.com' }, 400);
    }

    // 4. Check if this shop is already connected (to any user)
    const { data: existing } = await supabase
      .from('integration_keys')
      .select('id, user_id')
      .eq('shop_domain', domainClean)
      .eq('source', 'shopify')
      .eq('is_active', true)
      .maybeSingle();

    if (existing && existing.user_id !== user.id) {
      return json({ error: 'This store is already connected to another account' }, 409);
    }

    // 5. Generate API key
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const apiKey = 'rpk_shpfy_' + Array.from(randomBytes)
      .map(b => b.toString(36).padStart(2, '0')).join('').substring(0, 32);

    // Hash the key for storage
    const keyHash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey)))
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    let keyId: string;

    if (existing) {
      // Update existing connection
      keyId = existing.id;
      await supabase.from('integration_keys').update({
        connection_status: 'pending',
        is_active: true,
      }).eq('id', existing.id);
    } else {
      // Create new integration key
      const { data: newKey, error: insertErr } = await supabase
        .from('integration_keys')
        .insert({
          user_id: user.id,
          name: `Shopify: ${domainClean}`,
          source: 'shopify',
          shop_domain: domainClean,
          key_prefix: apiKey.substring(0, 17),
          key_hash: keyHash,
          is_active: true,
          connection_status: 'pending',
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[save-shopify-connection] Insert error:', insertErr.message);
        return json({ error: 'Failed to save connection: ' + insertErr.message }, 500);
      }
      keyId = newKey.id;
    }

    // 6. Store signing secret in Vault
    const { error: vaultErr } = await supabase.rpc('set_provider_secret', {
      p_key_id: keyId,
      p_secret: signing_secret,
    });
    if (vaultErr) {
      console.error('[save-shopify-connection] Vault error:', vaultErr.message);
      return json({ error: 'Failed to store secret securely' }, 500);
    }

    console.log(`[save-shopify-connection] Saved connection for ${domainClean} (key=${keyId})`);

    return json({
      success: true,
      integration_key_id: keyId,
      shop_domain: domainClean,
      status: 'pending',
      message: 'Connection saved. Run a test event to verify.',
    });
  } catch (e) {
    return json({ error: 'Internal error: ' + ((e as Error).message || 'unknown') }, 500);
  }
});
