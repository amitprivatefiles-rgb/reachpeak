// Supabase Edge Function: admin-billing
// Super-admin control plane for wallet billing. JWT-verified + role='admin' required.
// Actions:
//   get_config     → { gateway: {key_id, mode, is_active, webhook_configured}, pricing[], webhook_url }
//   save_gateway   → store platform Razorpay key_id/key_secret/webhook_secret (Vault). Generalized by `gateway`.
//   set_pricing    → upsert per-category message prices (paise)
//   list_wallets   → all users' balances + spend vs recharge (admin_wallet_overview)
//   adjust_wallet  → manually credit/debit a user's wallet (audited as type='adjust'/'debit')
//
// Deploy: supabase functions deploy admin-billing --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
// PUBLIC url for URLs shown to external services (Razorpay webhook). SUPABASE_URL is
// the internal gateway (http://api-gw:8000) which Razorpay can't resolve.
const PUBLIC_API_URL = (Deno.env.get('PUBLIC_API_URL') ?? 'https://api.reachpeakapi.in').replace(/\/$/, '');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });
const VALID_CATEGORIES = ['marketing', 'utility', 'authentication', 'service'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // ── Auth: user JWT, then require admin role ──
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Auth required' }, 401);
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: prof } = await db.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
    if (!prof || prof.role !== 'admin' || !prof.is_active) return json({ error: 'Admin only', code: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ─────────────── get_config ───────────────
    if (action === 'get_config') {
      const { data: gw } = await db.from('platform_payment_providers_public').select('*').eq('gateway', body.gateway || 'razorpay').maybeSingle();
      const { data: pricing } = await db.from('message_pricing').select('*').order('category');
      return json({
        ok: true,
        gateway: gw ?? null,
        pricing: pricing ?? [],
        webhook_url: `${PUBLIC_API_URL}/functions/v1/wallet-webhook`,
      });
    }

    // ─────────────── save_gateway ───────────────
    if (action === 'save_gateway') {
      const gateway = (body.gateway || 'razorpay').toString();
      const { key_id, key_secret, webhook_secret, mode } = body;
      if (!key_id) return json({ error: 'key_id is required' }, 400);
      if (mode && !['live', 'test'].includes(mode)) return json({ error: 'mode must be live or test' }, 400);

      const { data: existing } = await db.from('platform_payment_providers').select('id, key_secret_enc, webhook_secret_enc').eq('gateway', gateway).maybeSingle();

      const patch: Record<string, any> = { gateway, key_id, mode: mode || 'live', is_active: true, updated_at: new Date().toISOString() };

      // Only rotate the secret if a new one was supplied (blank = keep existing).
      if (key_secret) {
        const { data: vid, error: e } = await db.rpc('store_vault_secret', { p_secret: key_secret, p_name: `platform_${gateway}_key_${Date.now()}` });
        if (e || !vid) return json({ error: 'Failed to store key secret' }, 500);
        patch.key_secret_enc = vid;
      } else if (!existing) {
        return json({ error: 'key_secret is required for first-time setup' }, 400);
      }
      if (webhook_secret) {
        const { data: vid, error: e } = await db.rpc('store_vault_secret', { p_secret: webhook_secret, p_name: `platform_${gateway}_wh_${Date.now()}` });
        if (e || !vid) return json({ error: 'Failed to store webhook secret' }, 500);
        patch.webhook_secret_enc = vid;
      }

      if (existing) {
        await db.from('platform_payment_providers').update(patch).eq('id', existing.id);
      } else {
        patch.created_at = new Date().toISOString();
        await db.from('platform_payment_providers').insert(patch);
      }
      console.log(`[admin-billing] gateway ${gateway} saved by ${user.id} (secret_rotated=${!!key_secret}, wh_rotated=${!!webhook_secret})`);
      return json({ ok: true, webhook_url: `${PUBLIC_API_URL}/functions/v1/wallet-webhook` });
    }

    // ─────────────── set_pricing ───────────────
    if (action === 'set_pricing') {
      const prices = body.prices; // [{category, price_paise}]
      if (!Array.isArray(prices)) return json({ error: 'prices[] required' }, 400);
      for (const p of prices) {
        if (!VALID_CATEGORIES.includes(p.category)) return json({ error: `bad category ${p.category}` }, 400);
        const paise = Math.round(Number(p.price_paise));
        if (!Number.isFinite(paise) || paise < 0) return json({ error: `bad price for ${p.category}` }, 400);
        await db.from('message_pricing').upsert({
          category: p.category, price_paise: paise, updated_by: user.id, updated_at: new Date().toISOString(),
        }, { onConflict: 'category' });
      }
      const { data: pricing } = await db.from('message_pricing').select('*').order('category');
      return json({ ok: true, pricing });
    }

    // ─────────────── list_wallets ───────────────
    if (action === 'list_wallets') {
      const { data: rows } = await db.from('admin_wallet_overview').select('*').order('balance_paise', { ascending: true });
      return json({ ok: true, wallets: rows ?? [] });
    }

    // ─────────────── adjust_wallet ───────────────
    if (action === 'adjust_wallet') {
      const targetUser = (body.user_id ?? '').toString();
      const paise = Math.round(Number(body.amount_paise));
      const direction = body.direction === 'debit' ? 'debit' : 'credit';
      const note = (body.note ?? '').toString().slice(0, 300);
      if (!targetUser) return json({ error: 'user_id required' }, 400);
      if (!Number.isFinite(paise) || paise <= 0) return json({ error: 'amount_paise must be > 0' }, 400);

      const ref = 'admin:' + crypto.randomUUID();
      const meta = { by: user.id, note, kind: 'manual_adjust' };
      try {
        if (direction === 'credit') {
          const { data: tx, error } = await db.rpc('wallet_credit', { p_user: targetUser, p_amount: paise, p_reference: ref, p_meta: meta, p_type: 'adjust' });
          if (error) throw error;
          return json({ ok: true, transaction: tx });
        } else {
          const { data: tx, error } = await db.rpc('wallet_debit', { p_user: targetUser, p_amount: paise, p_reference: ref, p_meta: meta });
          if (error) throw error;
          return json({ ok: true, transaction: tx });
        }
      } catch (e: any) {
        const msg = (e.message || '').includes('insufficient_balance') ? 'Insufficient balance to debit' : (e.message || 'adjust failed');
        return json({ error: msg }, 400);
      }
    }

    return json({ error: 'unknown action' }, 400);
  } catch (err: any) {
    console.error('[admin-billing] error', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
