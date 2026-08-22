// Supabase Edge Function: create-subscription-order
// Creates a Razorpay ORDER for a ReachPeak plan (direct signups pay to activate).
// User-JWT authed. wallet-webhook activates the subscription on payment.
//
// Deploy: supabase functions deploy create-subscription-order --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPlatformProvider } from '../_shared/platformPay.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Plan catalogue (rupees). Keep in sync with the pricing page.
const PLANS: Record<string, { amount: number; label: string }> = {
  monthly: { amount: 2499, label: 'Monthly' },
  yearly:  { amount: 14999, label: 'Yearly' },
};

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
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Auth required' }, 401);
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const planKey = (body.plan ?? 'monthly').toString();
    const plan = PLANS[planKey];
    if (!plan) return json({ error: 'Invalid plan' }, 400);
    const amountPaise = plan.amount * 100;

    // Already active? Nothing to pay.
    const { data: existing } = await db.from('subscriptions')
      .select('id, status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (existing?.status === 'active') return json({ ok: true, already_active: true });

    const prov = await getPlatformProvider(db, 'razorpay');
    if (!prov) return json({ error: 'Payments not configured yet. Please contact support.', code: 'no_gateway' }, 503);

    // Create the Razorpay order.
    const receipt = 'sub_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const basicAuth = btoa(`${prov.key_id}:${prov.key_secret}`);
    const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise, currency: 'INR', receipt, payment_capture: 1,
        notes: { reachpeak_user: user.id, kind: 'subscription', plan: planKey, receipt },
      }),
    });
    if (!rzpResp.ok) {
      const t = await rzpResp.text();
      console.error('[create-subscription-order] Razorpay error', rzpResp.status, t);
      return json({ error: `Payment gateway error (${rzpResp.status})`, code: 'gateway_error' }, 502);
    }
    const order = await rzpResp.json();

    // Upsert a pending subscription row carrying the order id (webhook activates it).
    if (existing?.id) {
      await db.from('subscriptions').update({
        plan_type: planKey, amount: plan.amount, status: 'pending',
        rzp_order_id: order.id, rzp_payment_id: null, updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await db.from('subscriptions').insert({
        user_id: user.id, plan_type: planKey, amount: plan.amount, status: 'pending',
        rzp_order_id: order.id, business_name: body.business_name || (user.email ?? 'ReachPeak User'),
      });
    }

    return json({
      ok: true,
      order_id: order.id,
      amount_paise: amountPaise,
      currency: 'INR',
      key_id: prov.key_id,
      plan: planKey,
      plan_label: plan.label,
      prefill: { email: user.email ?? '' },
    });
  } catch (err: any) {
    console.error('[create-subscription-order] error', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
