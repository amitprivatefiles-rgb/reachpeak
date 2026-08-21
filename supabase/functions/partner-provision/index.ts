// Supabase Edge Function: partner-provision
// One-click connect for partner platforms (PeakCart). Server-to-server ONLY.
// Auto-creates/links a ReachPeak user for a partner store, mints an rpk_live_ API key,
// and returns it + a signup link — so the partner never copy-pastes a key.
//
// Auth:   X-Partner-Secret header must equal PARTNER_PROVISION_SECRET (shared, server-side only)
// Deploy: supabase functions deploy partner-provision --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PARTNER_SECRET = Deno.env.get('PARTNER_PROVISION_SECRET') ?? '';
const DASHBOARD_URL = (Deno.env.get('REACHPEAK_DASHBOARD_URL') ?? 'https://api.reachpeakapi.in').replace(/\/$/, '');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Partner-Secret',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
async function sha256(text: string): Promise<string> {
  const d = new TextEncoder().encode(text);
  const h = await crypto.subtle.digest('SHA-256', d);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
}
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── Auth: shared partner secret (server-to-server) ──
  const secret = req.headers.get('X-Partner-Secret') ?? '';
  if (!PARTNER_SECRET || secret !== PARTNER_SECRET) {
    return json({ error: 'Unauthorized', code: 'invalid_partner_secret' }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const external_store_id = (body.external_store_id ?? '').toString().trim() || null;
    const store_name = (body.store_name ?? '').toString().trim() || null;
    const owner_email = (body.owner_email ?? '').toString().trim().toLowerCase();
    if (!owner_email) return json({ error: 'owner_email is required' }, 400);

    // ── 1. Find or create the ReachPeak user for this store (by email) ──
    let userId: string | null = null;
    const { data: prof } = await db.from('profiles').select('id').eq('email', owner_email).maybeSingle();
    if (prof?.id) {
      userId = prof.id;
    } else {
      const { data: created, error: cErr } = await db.auth.admin.createUser({
        email: owner_email,
        email_confirm: true,
        user_metadata: { full_name: store_name || 'PeakCart Store', source: 'peakcart' },
      });
      if (created?.user?.id) {
        userId = created.user.id;
      } else {
        // Race / already exists → re-read profile
        const { data: p2 } = await db.from('profiles').select('id').eq('email', owner_email).maybeSingle();
        userId = p2?.id ?? null;
        if (!userId) return json({ error: 'Could not create or resolve user', detail: cErr?.message }, 500);
      }
    }

    // ── 1b. Auto-activate the account (PeakCart-provisioned = NO admin approval, NO plan selection) ──
    const { data: existingSub } = await db.from('subscriptions').select('id, status').eq('user_id', userId).maybeSingle();
    if (!existingSub) {
      await db.from('subscriptions').insert({
        user_id: userId,
        plan_type: 'monthly',
        amount: 0,
        status: 'active',
        business_name: store_name || 'PeakCart Store',
        starts_at: new Date().toISOString(),
        expires_at: '2099-12-31T00:00:00Z',
      });
    } else if (existingSub.status !== 'active') {
      await db.from('subscriptions').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', existingSub.id);
    }

    // ── 2. Rotate: deactivate any prior PeakCart key for this user (idempotent re-connect) ──
    await db.from('integration_keys').update({ is_active: false }).eq('user_id', userId).eq('source', 'peakcart');

    // ── 3. Mint a fresh rpk_live_ key ──
    const rawKey = 'rpk_live_' + crypto.randomUUID().replace(/-/g, '');
    const keyHash = await sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 17);
    const { error: insErr } = await db.from('integration_keys').insert({
      user_id: userId,
      name: 'PeakCart: ' + (store_name || external_store_id || owner_email),
      source: 'peakcart',
      key_prefix: keyPrefix,
      key_hash: keyHash,
      shop_domain: external_store_id,
      is_active: true,
      connection_status: 'active',
    });
    if (insErr) return json({ error: 'Failed to store key: ' + insErr.message }, 500);

    // ── 4. Is a WhatsApp number already connected for this user? ──
    const { data: wa } = await db.from('whatsapp_accounts')
      .select('status, display_phone_number, quality_rating, messaging_limit_tier')
      .eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();

    // ── 5. Best-effort magic sign-in link to the connect page (fallback: dashboard URL) ──
    let signup_url = DASHBOARD_URL + '/connect-whatsapp';
    try {
      const { data: link } = await db.auth.admin.generateLink({
        type: 'magiclink', email: owner_email,
        options: { redirectTo: DASHBOARD_URL + '/connect-whatsapp' },
      });
      if (link?.properties?.action_link) signup_url = link.properties.action_link;
    } catch (_) { /* fallback stays */ }

    return json({
      success: true,
      api_key: rawKey,                 // partner stores this (encrypted) and uses it as Bearer
      key_prefix: keyPrefix,
      waba_connected: !!wa,
      waba_status: wa?.status ?? null,
      phone: wa?.display_phone_number ?? null,
      quality_rating: wa?.quality_rating ?? null,
      messaging_tier: wa?.messaging_limit_tier ?? null,
      signup_url,                      // where to send the user to finish Meta WhatsApp signup
    });
  } catch (err: any) {
    console.error('[partner-provision] error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
