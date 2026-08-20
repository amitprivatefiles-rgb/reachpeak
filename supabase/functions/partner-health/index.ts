// Supabase Edge Function: partner-health
// API-key authenticated health/status endpoint for partner integrations (PeakCart).
// Mirrors partner-send's auth model. Returns the connected WhatsApp account's status,
// quality rating and messaging tier so the partner's dashboard can show "connected".
//
// Auth:   API key in Authorization header (Bearer rpk_live_...)
// Deploy: supabase functions deploy partner-health --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// SHA-256 hash (same as partner-send)
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  try {
    /* ── 1. Authenticate via API key (same model as partner-send) ── */
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'API key required', code: 'invalid_api_key' }, 401);

    const keyHash = await sha256(token);

    const { data: integration, error: keyErr } = await db
      .from('integration_keys')
      .select('id, user_id, source, is_active')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .maybeSingle();

    if (keyErr || !integration)
      return json({ error: 'Invalid or inactive API key', code: 'invalid_api_key' }, 401);

    // Update last_used_at (fire-and-forget)
    db.from('integration_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', integration.id)
      .then(() => {});

    const userId = integration.user_id;

    /* ── 2. Load the active WhatsApp Business account for this user ── */
    const { data: account } = await db
      .from('whatsapp_accounts')
      .select('display_phone_number, verified_name, quality_rating, status, messaging_limit_tier, marketing_paused, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!account) {
      // Key is valid but no WhatsApp number connected yet.
      return json({
        connected: false,
        waba_status: 'no_account',
        quality_rating: null,
        messaging_tier: null,
        error: 'No active WhatsApp account connected for this key',
        code: 'no_whatsapp_account',
      });
    }

    /* ── 3. Report status (shape matches PeakCart's reachpeak/client healthCheck) ── */
    return json({
      connected: account.status === 'connected',
      waba_status: account.status || 'unknown',
      quality_rating: account.quality_rating ?? null,
      messaging_tier: account.messaging_limit_tier ?? null,
      display_phone_number: account.display_phone_number ?? null,
      verified_name: account.verified_name ?? null,
      marketing_paused: account.marketing_paused ?? false,
    });

  } catch (err: any) {
    console.error('[partner-health] Unhandled error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
