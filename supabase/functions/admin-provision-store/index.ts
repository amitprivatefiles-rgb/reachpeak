// Supabase Edge Function: admin-provision-store
// Option C admin tooling. JWT + role='admin'. Uses the founder's System User token
// (stored once, in Vault) to link a store's WhatsApp number — added under the
// founder's BM in WhatsApp Manager — to that store's ReachPeak account, so the
// founder's BM pays Meta and the store's wallet is debited.
//
// Actions:
//   get_config         → { token_configured, business_id }
//   save_system_token  → store/rotate the System User token (Vault) + business_id
//   provision          → link a number to a store account (+ optional wallet credit)
//   list_managed       → all managed accounts (admin_managed_accounts view)
//   unlink             → deactivate a managed account
//
// Deploy: supabase functions deploy admin-provision-store --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const GRAPH = `https://graph.facebook.com/${Deno.env.get('META_GRAPH_VERSION') ?? 'v25.0'}`;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

async function getSystemToken(): Promise<string | null> {
  const { data: cfg } = await db.from('managed_whatsapp_config').select('system_token_enc').eq('singleton', true).maybeSingle();
  if (!cfg?.system_token_enc) return null;
  const { data: token } = await db.rpc('get_vault_secret', { secret_id: cfg.system_token_enc });
  return token ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // ── Auth: admin only ──
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Auth required' }, 401);
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);
    const { data: prof } = await db.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
    if (!prof || prof.role !== 'admin' || !prof.is_active) return json({ error: 'Admin only' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ─────────────── get_config ───────────────
    if (action === 'get_config') {
      const { data: st } = await db.from('managed_whatsapp_status').select('*').maybeSingle();
      return json({ ok: true, token_configured: !!st?.token_configured, business_id: st?.business_id ?? null, updated_at: st?.updated_at ?? null });
    }

    // ─────────────── save_system_token ───────────────
    if (action === 'save_system_token') {
      const sysToken = (body.system_token ?? '').toString().trim();
      const businessId = (body.business_id ?? '').toString().trim() || null;
      const patch: Record<string, any> = { singleton: true, updated_by: user.id, updated_at: new Date().toISOString() };
      if (businessId) patch.business_id = businessId;

      if (sysToken) {
        // Validate the token against Graph before storing (fail fast on a bad paste).
        const check = await fetch(`${GRAPH}/me?access_token=${encodeURIComponent(sysToken)}`);
        if (!check.ok) {
          const t = await check.json().catch(() => ({}));
          return json({ error: 'Token rejected by Meta: ' + (t?.error?.message || check.status) }, 400);
        }
        const { data: vid, error: e } = await db.rpc('store_vault_secret', { p_secret: sysToken, p_name: `managed_wa_systoken_${Date.now()}` });
        if (e || !vid) return json({ error: 'Failed to store token' }, 500);
        patch.system_token_enc = vid;
      }

      const { data: existing } = await db.from('managed_whatsapp_config').select('singleton').eq('singleton', true).maybeSingle();
      if (existing) await db.from('managed_whatsapp_config').update(patch).eq('singleton', true);
      else {
        if (!sysToken) return json({ error: 'system_token is required for first-time setup' }, 400);
        await db.from('managed_whatsapp_config').insert(patch);
      }
      return json({ ok: true, token_configured: true });
    }

    // ─────────────── provision ───────────────
    if (action === 'provision') {
      const email = (body.email ?? '').toString().trim().toLowerCase();
      const phoneNumberId = (body.phone_number_id ?? '').toString().trim();
      const wabaId = (body.waba_id ?? '').toString().trim() || null;
      const storeName = (body.store_name ?? '').toString().trim() || null;
      const openingCreditPaise = Math.max(0, Math.round(Number(body.opening_credit_paise ?? 0)));
      if (!email) return json({ error: 'Store email is required' }, 400);
      if (!phoneNumberId) return json({ error: 'phone_number_id is required (from WhatsApp Manager)' }, 400);

      const sysToken = await getSystemToken();
      if (!sysToken) return json({ error: 'Configure the System User token first', code: 'no_system_token' }, 400);

      // 1. Verify the number is reachable under our BM via the system token.
      const infoRes = await fetch(`${GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
        { headers: { Authorization: `Bearer ${sysToken}` } });
      const info = await infoRes.json().catch(() => ({}));
      if (!infoRes.ok) {
        return json({ error: 'Could not read this number with your System User token. Check the phone_number_id and that the number is under your Business. Meta says: ' + (info?.error?.message || infoRes.status), code: 'number_unreachable' }, 400);
      }

      // 2. Find or create the store's ReachPeak user.
      let userId: string | null = null;
      const { data: p } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
      if (p?.id) userId = p.id;
      else {
        const { data: created, error: cErr } = await db.auth.admin.createUser({
          email, email_confirm: true, user_metadata: { full_name: storeName || email, source: 'managed' },
        });
        userId = created?.user?.id ?? null;
        if (!userId) {
          const { data: p2 } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
          userId = p2?.id ?? null;
        }
        if (!userId) return json({ error: 'Could not create store user: ' + (cErr?.message || 'unknown') }, 500);
      }

      // 3. Activate subscription (managed = no approval).
      const { data: sub } = await db.from('subscriptions').select('id, status').eq('user_id', userId).maybeSingle();
      if (!sub) {
        await db.from('subscriptions').insert({
          user_id: userId, plan_type: 'monthly', amount: 0, status: 'active',
          business_name: storeName || email, starts_at: new Date().toISOString(), expires_at: '2099-12-31T00:00:00Z',
        });
      } else if (sub.status !== 'active') {
        await db.from('subscriptions').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', sub.id);
      }

      // 4. Best-effort: subscribe app to the WABA + register the number for Cloud API.
      if (wabaId) {
        await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, { method: 'POST', headers: { Authorization: `Bearer ${sysToken}` } }).catch(() => {});
      }
      await fetch(`${GRAPH}/${phoneNumberId}/register`, {
        method: 'POST', headers: { Authorization: `Bearer ${sysToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', pin: '000000' }),
      }).catch(() => {});

      // 5. Link the number to the store's account (managed).
      const { data: acct, error: upErr } = await db.from('whatsapp_accounts').upsert({
        user_id: userId, waba_id: wabaId, phone_number_id: phoneNumberId,
        access_token: '***VAULT***', display_phone_number: info?.display_phone_number ?? null,
        verified_name: info?.verified_name ?? null, quality_rating: info?.quality_rating ?? null,
        status: 'connected', is_active: true, is_system: false, onboarded_via: 'managed',
        last_registered_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'phone_number_id' }).select('id').single();
      if (upErr || !acct?.id) return json({ error: 'Failed to link number: ' + (upErr?.message || 'unknown') }, 500);

      // 6. Store the system token as this account's send token (existing send paths decrypt per-account).
      const { error: tokErr } = await db.rpc('set_waba_access_token', { p_account_id: acct.id, p_token: sysToken });
      if (tokErr) {
        // Roll back the link so a half-provisioned account can't sit unable to send.
        await db.from('whatsapp_accounts').update({ is_active: false, status: 'error' }).eq('id', acct.id);
        return json({ error: 'Linked the number but could not store its send token: ' + tokErr.message, code: 'token_store_failed' }, 500);
      }

      // 7. Optional opening wallet credit.
      let credited = 0;
      if (openingCreditPaise > 0) {
        const { data: tx } = await db.rpc('wallet_credit', {
          p_user: userId, p_amount: openingCreditPaise, p_reference: 'admin:provision:' + acct.id,
          p_meta: { by: user.id, kind: 'opening_credit' }, p_type: 'adjust',
        });
        if (tx) credited = openingCreditPaise;
      }

      // 8. Mark onboarding done (managed/wallet).
      await db.from('profiles').update({ onboarding_choice: 'wallet', onboarding_completed: true, updated_at: new Date().toISOString() }).eq('id', userId);

      return json({
        ok: true,
        account: { id: acct.id, phone: info?.display_phone_number, name: info?.verified_name, user_id: userId, email },
        credited_paise: credited,
      });
    }

    // ─────────────── list_managed ───────────────
    if (action === 'list_managed') {
      const { data } = await db.from('admin_managed_accounts').select('*').order('created_at', { ascending: false }).limit(500);
      return json({ ok: true, accounts: data ?? [] });
    }

    // ─────────────── unlink ───────────────
    if (action === 'unlink') {
      const id = (body.id ?? '').toString();
      if (!id) return json({ error: 'id required' }, 400);
      await db.from('whatsapp_accounts').update({ is_active: false, status: 'disconnected', updated_at: new Date().toISOString() }).eq('id', id);
      return json({ ok: true });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (err: any) {
    console.error('[admin-provision-store] error', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
