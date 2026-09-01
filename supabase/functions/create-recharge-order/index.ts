// Supabase Edge Function: create-recharge-order
// Creates a Razorpay ORDER for a wallet top-up using the PLATFORM Razorpay keys.
// User-JWT authenticated. Min ₹1000. The dashboard opens Razorpay Checkout with the
// returned order_id; wallet-webhook credits the wallet on payment (never trust the client).
//
// Deploy: supabase functions deploy create-recharge-order --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPlatformProvider } from '../_shared/platformPay.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const MIN_PAISE = 1000 * 100; // ₹1000 minimum
const MAX_PAISE = 500000 * 100; // ₹5,00,000 sanity cap per order

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // ── Auth: user JWT ──
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Auth required' }, 401);
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const rupees = Number(body.amount);
    if (!Number.isFinite(rupees) || rupees <= 0) return json({ error: 'amount (in ₹) is required' }, 400);
    const amountPaise = Math.round(rupees * 100);
    if (amountPaise < MIN_PAISE) return json({ error: `Minimum recharge is ₹${MIN_PAISE / 100}`, code: 'below_minimum' }, 400);
    if (amountPaise > MAX_PAISE) return json({ error: `Maximum per recharge is ₹${MAX_PAISE / 100}`, code: 'above_maximum' }, 400);

    // ── Load platform gateway ──
    const prov = await getPlatformProvider(db, 'razorpay');
    if (!prov) return json({ error: 'Payments not configured yet. Please contact support.', code: 'no_gateway' }, 503);

    // ── Our recharge record (created) — receipt drives idempotency + GST history ──
    const receipt = 'wlt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const gst = body.gst && typeof body.gst === 'object' ? body.gst : {};

    // ── Create Razorpay order ──
    const basicAuth = btoa(`${prov.key_id}:${prov.key_secret}`);
    const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1,
        notes: { reachpeak_wallet: user.id, kind: 'wallet_topup', receipt },
      }),
    });
    if (!rzpResp.ok) {
      const t = await rzpResp.text();
      console.error('[create-recharge-order] Razorpay error', rzpResp.status, t);
      return json({ error: `Payment gateway error (${rzpResp.status})`, code: 'gateway_error' }, 502);
    }
    const order = await rzpResp.json();

    // ── Persist recharge (created). Webhook will flip to paid + credit wallet. ──
    const { error: insErr } = await db.from('wallet_recharges').insert({
      user_id: user.id,
      gateway: 'razorpay',
      rzp_order_id: order.id,
      amount_paise: amountPaise,
      currency: 'INR',
      status: 'created',
      receipt,
      meta: { gst, mode: prov.mode },
    });
    if (insErr) { console.error('[create-recharge-order] insert error', insErr.message); return json({ error: 'Could not create order record' }, 500); }

    return json({
      ok: true,
      order_id: order.id,
      amount_paise: amountPaise,
      currency: 'INR',
      key_id: prov.key_id,       // public — safe for Checkout
      mode: prov.mode,
      receipt,
      prefill: { email: user.email ?? '' },
    });
  } catch (err: any) {
    console.error('[create-recharge-order] error', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
