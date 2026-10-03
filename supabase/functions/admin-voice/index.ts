// Supabase Edge Function: admin-voice
// Super-admin control plane for AI Calling on Plivo. JWT-verified + role='admin' required.
// Actions:
//   status           → connection (no secrets), Plivo app, numbers, voice-server health, webhook URLs (secret masked)
//   save_credentials → { auth_id, auth_token }: verified against Plivo, token stored in Vault
//   verify           → re-check Plivo account (name, balance)
//   setup_app        → create/update the Plivo Application with our answer + hangup URLs, then sync numbers and link assigned ones
//   sync_numbers     → import numbers rented on the Plivo account into voice_numbers (keeps assignments)
//   link_number      → { number }: attach a number to our Plivo Application
//   rotate_secret    → new webhook path secret (updates the Plivo Application too)
//   set_strict       → { on }: reject webhooks without a valid Plivo signature
//   account_overview → { user_id }: wallet, WhatsApp, integrations, agents for one business
//
// Deploy: supabase functions deploy admin-voice --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const APP_NAME = 'ReachPeak-AI-Voice';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

type Settings = { plivo_auth_id: string | null; plivo_token_vault: string | null; path_secret_vault: string | null; public_base: string; plivo_app_id: string | null; strict_signatures: boolean };

async function settings(): Promise<Settings> {
  const { data } = await db.from('voice_settings').select('*').eq('id', 1).single();
  return data as Settings;
}
async function secret(id: string | null): Promise<string | null> {
  if (!id) return null;
  const { data } = await db.rpc('get_vault_secret', { secret_id: id });
  return (data as string) || null;
}
async function store(value: string, name: string): Promise<string> {
  const { data, error } = await db.rpc('store_vault_secret', { p_secret: value, p_name: `${name}_${Date.now()}` });
  if (error || !data) throw new Error('Could not store secret: ' + (error?.message || 'unknown'));
  return data as string;
}
const randomSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');

async function plivo(authId: string, token: string, method: string, path: string, body?: Record<string, unknown>) {
  const r = await fetch(`https://api.plivo.com/v1/Account/${authId}/${path}`, {
    method, signal: AbortSignal.timeout(15000),
    headers: { Authorization: 'Basic ' + btoa(`${authId}:${token}`), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const e = data && typeof data === 'object' ? (data.error ?? data.message ?? data) : data;
    const msg = typeof e === 'string' ? e : Object.entries(e || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`).join('; ');
    throw new Error(`Plivo ${r.status}: ${String(msg || text).slice(0, 300)}`);
  }
  return data;
}
async function creds() {
  const s = await settings();
  const token = await secret(s.plivo_token_vault);
  if (!s.plivo_auth_id || !token) throw new Error('Plivo is not connected yet. Add your Auth ID and Auth Token first.');
  return { s, authId: s.plivo_auth_id, token };
}
async function pathSecret(s: Settings): Promise<string> {
  let v = await secret(s.path_secret_vault);
  if (!v) {
    v = randomSecret();
    const id = await store(v, 'voice_path_secret');
    await db.from('voice_settings').update({ path_secret_vault: id, updated_at: new Date().toISOString() }).eq('id', 1);
  }
  return v;
}
const urls = (base: string, sec: string) => ({ answer_url: `${base}/plivo/answer/${sec}`, hangup_url: `${base}/plivo/hangup/${sec}` });
const mask = (u: string) => u.replace(/\/([0-9a-f]{12})[0-9a-f]+$/, '/$1…');

async function verifyAccount(authId: string, token: string) {
  const acct = await plivo(authId, token, 'GET', '');
  const patch = { account_name: acct?.name || acct?.account_type || 'Plivo account', cash_credits: acct?.cash_credits ?? null, last_verified_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() };
  await db.from('voice_settings').update(patch).eq('id', 1);
  return patch;
}

// Import every number on the Plivo account (keeps account/agent assignments), mark removed ones.
async function syncNumbers(authId: string, token: string, appId: string | null) {
  const all: any[] = [];
  for (let offset = 0; offset < 1000; offset += 20) {
    const page = await plivo(authId, token, 'GET', `Number/?limit=20&offset=${offset}`);
    const objs = page?.objects || [];
    all.push(...objs);
    if (objs.length < 20) break;
  }
  const now = new Date().toISOString();
  const seen: string[] = [];
  for (const n of all) {
    const number = String(n.number || '').replace(/\D/g, '');
    if (!number) continue;
    seen.push(number);
    const linked = !!(appId && String(n.application || '').includes(appId));
    const row = { number, alias: n.alias || null, number_type: n.number_type || null, region: n.region || null, monthly_rental: n.monthly_rental_rate ?? null, linked, on_plivo: true, last_synced_at: now };
    const { data: existing } = await db.from('voice_numbers').select('number, alias').eq('number', number).maybeSingle();
    if (existing) await db.from('voice_numbers').update({ ...row, alias: n.alias || existing.alias || null }).eq('number', number);
    else await db.from('voice_numbers').insert(row);
  }
  const { data: rows } = await db.from('voice_numbers').select('number');
  for (const r of rows || []) if (!seen.includes(r.number)) await db.from('voice_numbers').update({ on_plivo: false, linked: false, last_synced_at: now }).eq('number', r.number);
  return seen.length;
}
// Numbers already assigned to an account but not yet pointing at our app → link them (assigned = meant for AI Calling).
async function linkAssigned(authId: string, token: string, appId: string) {
  const { data: rows } = await db.from('voice_numbers').select('number').eq('on_plivo', true).eq('linked', false).not('user_id', 'is', null);
  const linked: string[] = [], failed: string[] = [];
  for (const r of rows || []) {
    try { await plivo(authId, token, 'POST', `Number/${r.number}/`, { app_id: appId }); await db.from('voice_numbers').update({ linked: true }).eq('number', r.number); linked.push(r.number); }
    catch { failed.push(r.number); }
  }
  return { linked, failed };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!jwt) return json({ error: 'Auth required' }, 401);
    const anon = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);
    const { data: prof } = await db.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
    if (!prof || prof.role !== 'admin' || !prof.is_active) return json({ error: 'Admin only' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'status') {
      const s = await settings();
      const connected = !!(s.plivo_auth_id && s.plivo_token_vault);
      const sec = connected ? await pathSecret(s) : null;
      const { data: row } = await db.from('voice_settings').select('account_name, cash_credits, last_verified_at, last_error, plivo_app_id, strict_signatures, public_base').eq('id', 1).single();
      let health: any = null;
      try { const r = await fetch(`${s.public_base}/health`, { signal: AbortSignal.timeout(6000) }); health = await r.json(); } catch (e) { health = { ok: false, error: (e as Error).message }; }
      const u = sec ? urls(s.public_base, sec) : null;
      return json({ ok: true, connected, auth_id: s.plivo_auth_id ? s.plivo_auth_id.slice(0, 6) + '…' : null, ...row, health,
        webhooks: u ? { answer_url: mask(u.answer_url), hangup_url: mask(u.hangup_url) } : null });
    }

    if (action === 'save_credentials') {
      const authId = String(body.auth_id || '').trim(), token = String(body.auth_token || '').trim();
      if (!/^[A-Z0-9]{16,40}$/i.test(authId) || token.length < 20) return json({ error: 'Please paste the Auth ID and Auth Token exactly as shown in the Plivo console.' }, 400);
      let info;
      try { info = await verifyAccount(authId, token); }
      catch (e) { return json({ error: 'Plivo did not accept these credentials. ' + (e as Error).message }, 400); }
      const vid = await store(token, 'plivo_auth_token');
      await db.from('voice_settings').update({ plivo_auth_id: authId, plivo_token_vault: vid, updated_at: new Date().toISOString() }).eq('id', 1);
      return json({ ok: true, ...info });
    }

    if (action === 'verify') {
      const { authId, token } = await creds();
      try { return json({ ok: true, ...(await verifyAccount(authId, token)) }); }
      catch (e) { await db.from('voice_settings').update({ last_error: (e as Error).message, updated_at: new Date().toISOString() }).eq('id', 1); throw e; }
    }

    if (action === 'setup_app' || action === 'rotate_secret') {
      const { s, authId, token } = await creds();
      let sec: string;
      if (action === 'rotate_secret') {
        sec = randomSecret();
        const id = await store(sec, 'voice_path_secret');
        await db.from('voice_settings').update({ path_secret_vault: id, updated_at: new Date().toISOString() }).eq('id', 1);
      } else sec = await pathSecret(s);
      const u = urls(s.public_base, sec);
      const cfg = { answer_url: u.answer_url, answer_method: 'POST', hangup_url: u.hangup_url, hangup_method: 'POST' };
      let appId = s.plivo_app_id;
      if (appId) {
        try { await plivo(authId, token, 'POST', `Application/${appId}/`, cfg); }
        catch (e) { if (/404/.test((e as Error).message)) appId = null; else throw e; }
      }
      if (!appId) {
        try {
          const list = await plivo(authId, token, 'GET', 'Application/?limit=20');
          const mine = (list?.objects || []).find((a: any) => a.app_name === APP_NAME);
          if (mine?.app_id) { appId = String(mine.app_id); await plivo(authId, token, 'POST', `Application/${appId}/`, cfg); }
        } catch { /* fall through to create */ }
      }
      if (!appId) {
        const created = await plivo(authId, token, 'POST', 'Application/', { app_name: APP_NAME, ...cfg });
        appId = created?.app_id;
        if (!appId) throw new Error('Plivo did not return an app_id');
      }
      await db.from('voice_settings').update({ plivo_app_id: appId, updated_at: new Date().toISOString() }).eq('id', 1);
      let found = 0, link = { linked: [] as string[], failed: [] as string[] }, syncError = '';
      try { found = await syncNumbers(authId, token, appId); link = await linkAssigned(authId, token, appId); } catch (e) { syncError = (e as Error).message; }
      return json({ ok: true, app_id: appId, answer_url: mask(u.answer_url), hangup_url: mask(u.hangup_url), rotated: action === 'rotate_secret', numbers_found: found, numbers_linked: link.linked, numbers_failed: link.failed, sync_error: syncError || undefined });
    }

    if (action === 'sync_numbers') {
      const { s: st, authId, token } = await creds();
      const found = await syncNumbers(authId, token, st.plivo_app_id);
      const link = st.plivo_app_id ? await linkAssigned(authId, token, st.plivo_app_id) : { linked: [], failed: [] };
      return json({ ok: true, found, numbers_linked: link.linked, numbers_failed: link.failed });
    }

    if (action === 'link_number') {
      const { s, authId, token } = await creds();
      if (!s.plivo_app_id) return json({ error: 'Run "Set up Plivo app" first.' }, 400);
      const number = String(body.number || '').replace(/\D/g, '');
      if (!number) return json({ error: 'number required' }, 400);
      await plivo(authId, token, 'POST', `Number/${number}/`, { app_id: s.plivo_app_id });
      await db.from('voice_numbers').update({ linked: true, updated_at: new Date().toISOString() }).eq('number', number);
      return json({ ok: true });
    }

    if (action === 'account_overview') {
      // Everything the admin needs to set up AI Calling for one business, in one call.
      const uid = String(body.user_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(uid)) return json({ error: 'user_id required' }, 400);
      const [prof, wallet, wa, keys, agents] = await Promise.all([
        db.from('profiles').select('id, full_name, email, business_type, is_active').eq('id', uid).maybeSingle(),
        db.from('wallets').select('balance_paise, held_paise').eq('user_id', uid).maybeSingle(),
        db.from('whatsapp_accounts').select('display_phone_number, verified_name, status, is_active, quality_rating, is_system').eq('user_id', uid),
        db.from('integration_keys').select('name, source, is_active, connection_status, last_event_at, shop_domain, created_at').eq('user_id', uid),
        db.from('voice_agents').select('id, name, is_active, direction').eq('user_id', uid),
      ]);
      return json({ ok: true, profile: prof.data, wallet: wallet.data || { balance_paise: 0, held_paise: 0 },
        whatsapp: (wa.data || []).filter((w: any) => !w.is_system), integrations: keys.data || [], agents: agents.data || [] });
    }

    if (action === 'set_strict') {
      await db.from('voice_settings').update({ strict_signatures: !!body.on, updated_at: new Date().toISOString() }).eq('id', 1);
      return json({ ok: true, strict_signatures: !!body.on });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || 'Server error' }, 500);
  }
});
