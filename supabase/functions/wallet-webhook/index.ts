// Supabase Edge Function: wallet-webhook
// Razorpay webhook for PLATFORM wallet top-ups. HMAC-verified against the platform
// webhook secret. Credits the user's wallet exactly once per payment (idempotent).
// Configure this URL in the founder's Razorpay Dashboard → Webhooks:
//   https://api.reachpeakapi.in/functions/v1/wallet-webhook   (events: order.paid, payment.captured)
//
// Deploy: supabase functions deploy wallet-webhook --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPlatformProvider, hmacSha256Hex, safeEqual } from '../_shared/platformPay.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Credit the wallet for a paid recharge, once. Returns true if credited (or already was).
async function creditRecharge(rzpOrderId: string, rzpPaymentId: string | null): Promise<void> {
  const { data: rec } = await db.from('wallet_recharges')
    .select('*').eq('rzp_order_id', rzpOrderId).maybeSingle();
  if (!rec) { console.log('[wallet-webhook] no recharge for order', rzpOrderId); return; }
  if (rec.status === 'paid' && rec.credited_tx_id) { return; } // already done

  // Idempotent credit — reference = payment id (falls back to order id) so retries never double-credit.
  const ref = 'rzp:' + (rzpPaymentId || rzpOrderId);
  const { data: tx, error: creditErr } = await db.rpc('wallet_credit', {
    p_user: rec.user_id,
    p_amount: rec.amount_paise,
    p_reference: ref,
    p_meta: { source: 'recharge', rzp_order_id: rzpOrderId, rzp_payment_id: rzpPaymentId, receipt: rec.receipt },
    p_type: 'credit',
  });
  if (creditErr) { console.error('[wallet-webhook] credit error', creditErr.message); throw new Error(creditErr.message); }

  await db.from('wallet_recharges').update({
    status: 'paid',
    rzp_payment_id: rzpPaymentId,
    credited_tx_id: tx?.id ?? null,
    paid_at: new Date().toISOString(),
  }).eq('id', rec.id);
  console.log(`[wallet-webhook] credited ₹${rec.amount_paise / 100} to ${rec.user_id} (order=${rzpOrderId})`);
}

// Activate a subscription paid via Razorpay, once. No-op if the order isn't a
// subscription order. Idempotent (already-active → skip).
async function activateSubscription(rzpOrderId: string, rzpPaymentId: string | null): Promise<void> {
  const { data: sub } = await db.from('subscriptions').select('id, status, plan_type').eq('rzp_order_id', rzpOrderId).maybeSingle();
  if (!sub) return;                       // not a subscription order
  if (sub.status === 'active') return;     // already activated
  const now = new Date();
  const expires = new Date(now);
  if (sub.plan_type === 'yearly') expires.setFullYear(expires.getFullYear() + 1);
  else expires.setMonth(expires.getMonth() + 1);
  await db.from('subscriptions').update({
    status: 'active', starts_at: now.toISOString(), expires_at: expires.toISOString(),
    rzp_payment_id: rzpPaymentId, updated_at: now.toISOString(),
  }).eq('id', sub.id);
  console.log(`[wallet-webhook] subscription activated for order ${rzpOrderId} (${sub.plan_type})`);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const rawBody = await req.text();
    const sig = req.headers.get('X-Razorpay-Signature') ?? '';

    const prov = await getPlatformProvider(db, 'razorpay');
    if (!prov || !prov.webhook_secret) {
      console.error('[wallet-webhook] no platform webhook secret configured');
      return json({ error: 'Webhook not configured' }, 500);
    }

    // HMAC verification is the real auth — must pass before any data access.
    const computed = await hmacSha256Hex(rawBody, prov.webhook_secret);
    if (!safeEqual(computed, sig)) {
      console.error('[wallet-webhook] signature mismatch');
      return json({ error: 'Invalid signature' }, 401);
    }

    const body = JSON.parse(rawBody);
    const event = body.event;

    if (event === 'order.paid') {
      const orderEntity = body.payload?.order?.entity;
      const paymentEntity = body.payload?.payment?.entity;
      if (orderEntity?.id) {
        // Both are safe: each no-ops if the order isn't of its kind.
        await creditRecharge(orderEntity.id, paymentEntity?.id ?? null);
        await activateSubscription(orderEntity.id, paymentEntity?.id ?? null);
      }
      return json({ ok: true });
    }

    if (event === 'payment.captured') {
      const paymentEntity = body.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const kind = paymentEntity?.notes?.kind;
      if (orderId) {
        if (kind === 'subscription') {
          await activateSubscription(orderId, paymentEntity?.id ?? null);
        } else if (kind === 'wallet_topup' || !kind) {
          await creditRecharge(orderId, paymentEntity?.id ?? null);
        }
      }
      return json({ ok: true });
    }

    if (event === 'payment.failed') {
      const orderId = body.payload?.payment?.entity?.order_id;
      if (orderId) {
        await db.from('wallet_recharges').update({ status: 'failed' })
          .eq('rzp_order_id', orderId).eq('status', 'created');
      }
      return json({ ok: true });
    }

    return json({ ok: true, ignored: event });
  } catch (err: any) {
    console.error('[wallet-webhook] error', err);
    // 500 → Razorpay will retry (good for transient DB errors; credit is idempotent).
    return json({ error: err.message || 'error' }, 500);
  }
});
