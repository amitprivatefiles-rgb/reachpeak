// Supabase Edge Function: razorpay-webhook
// Receives Razorpay webhook events. HMAC-verified per-tenant via ?u=<user_id>.
// Handles payment_link.paid + payment.captured. Idempotent, out-of-order safe.
// Emits internal order_paid event on payment confirmation.
//
// Deploy: supabase functions deploy razorpay-webhook --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { normalizePhone, runPipeline } from '../_shared/eventPipeline.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// HMAC-SHA256 verification
async function verifyHmac(rawBody: string, secret: string, expectedSig: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === expectedSig;
}

// Status regression guard — these statuses should not be overwritten
const TERMINAL_STATUSES = new Set(['delivered', 'rto', 'returned', 'refunded']);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // 1. Tenant resolution via ?u= query param
    const url = new URL(req.url);
    const userId = url.searchParams.get('u');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing tenant param' }), { status: 400 });
    }

    // Read RAW body before parsing (HMAC must verify raw)
    const rawBody = await req.text();
    const razorpaySig = req.headers.get('X-Razorpay-Signature') ?? '';

    // 2. Load tenant's webhook_secret from Vault
    const { data: provider } = await db.from('payment_providers')
      .select('id, user_id, webhook_secret_enc, is_active')
      .eq('user_id', userId)
      .eq('provider', 'razorpay')
      .eq('is_active', true)
      .maybeSingle();

    if (!provider || !provider.webhook_secret_enc) {
      return new Response(JSON.stringify({ error: 'Unknown tenant or no webhook secret' }), { status: 401 });
    }

    // Decrypt webhook secret from Vault
    const { data: webhookSecret, error: vaultErr } = await db.rpc('get_vault_secret', {
      secret_id: provider.webhook_secret_enc,
    });
    if (vaultErr || !webhookSecret) {
      console.error('[razorpay-webhook] Vault decrypt error:', vaultErr?.message);
      return new Response(JSON.stringify({ error: 'Webhook secret decryption failed' }), { status: 500 });
    }

    // 3. HMAC verification — this is the real auth, must pass before any data access
    const hmacValid = await verifyHmac(rawBody, webhookSecret, razorpaySig);
    if (!hmacValid) {
      console.error(`[razorpay-webhook] HMAC failed for user=${userId}`);
      return new Response(JSON.stringify({ error: 'Signature verification failed' }), { status: 401 });
    }

    // 4. Parse body (only after HMAC passes)
    const body = JSON.parse(rawBody);
    const eventType = body.event;

    // Handle payment_link.paid and payment.captured
    if (eventType !== 'payment_link.paid' && eventType !== 'payment.captured') {
      // Acknowledge to prevent Razorpay retries
      return new Response(JSON.stringify({ ok: true, ignored: true, event: eventType }), { status: 200 });
    }

    const entity = body.payload?.payment_link?.entity || body.payload?.payment?.entity;
    if (!entity) {
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: 'no entity' }), { status: 200 });
    }

    // Extract fields
    const rzpPlinkId = entity.id || body.payload?.payment_link?.entity?.id;
    const rzpPaymentId = body.payload?.payment?.entity?.id || entity.payments?.[0]?.payment_id;
    const paidAmount = entity.amount_paid || entity.amount;

    if (!rzpPlinkId) {
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: 'no plink_id' }), { status: 200 });
    }

    // 5. Find payment_links row
    const { data: plRow } = await db.from('payment_links')
      .select('*')
      .eq('rzp_plink_id', rzpPlinkId)
      .maybeSingle();

    if (!plRow) {
      console.log(`[razorpay-webhook] plink ${rzpPlinkId} not found in payment_links`);
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: 'plink not found' }), { status: 200 });
    }

    // Cross-tenant verification — the payment_link must belong to the user from ?u=
    if (plRow.user_id !== userId) {
      console.error(`[razorpay-webhook] Cross-tenant rejection: plink belongs to ${plRow.user_id}, ?u=${userId}`);
      return new Response(JSON.stringify({ error: 'Tenant mismatch' }), { status: 401 });
    }

    // Idempotent: already paid → no-op
    if (plRow.status === 'paid') {
      return new Response(JSON.stringify({ ok: true, already_paid: true }), { status: 200 });
    }

    // 6. Mark payment link as paid
    const now = new Date().toISOString();
    await db.from('payment_links').update({
      status: 'paid',
      rzp_payment_id: rzpPaymentId || null,
      paid_at: now,
      updated_at: now,
    }).eq('id', plRow.id);

    // 7. Update linked order (if any)
    if (plRow.order_id) {
      const { data: order } = await db.from('orders')
        .select('id, status, external_order_id, contact_phone, source')
        .eq('id', plRow.order_id)
        .maybeSingle();

      if (order) {
        // Status regression guard — don't move backwards
        if (!TERMINAL_STATUSES.has(order.status)) {
          await db.from('orders').update({
            converted_to_prepaid: true,
            is_cod: false,
            payment_method: 'prepaid',
            status: 'confirmed',
            confirmed_at: now,
            updated_at: now,
          }).eq('id', order.id);
        } else {
          // Still mark converted even if status is terminal
          await db.from('orders').update({
            converted_to_prepaid: true,
            is_cod: false,
            payment_method: 'prepaid',
            updated_at: now,
          }).eq('id', order.id);
        }

        // 8. Emit internal order_paid event via pipeline
        if (order.contact_phone) {
          runPipeline(db, SUPABASE_URL, SERVICE_ROLE, {
            userId,
            source: order.source || 'api',
            eventType: 'order_paid',
            dedupeKey: `order_paid:${order.external_order_id}:rzp`,
            phone: order.contact_phone,
            contactName: null,
            payload: {
              order_id: order.external_order_id,
              payment_method: 'prepaid',
              rzp_payment_id: rzpPaymentId,
            },
          }).catch(err => {
            console.error('[razorpay-webhook] order_paid pipeline error:', err.message);
          });
        }
      }
    }

    console.log(`[razorpay-webhook] Paid: plink=${rzpPlinkId} user=${userId} order=${plRow.order_id || 'standalone'}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err: any) {
    console.error('[razorpay-webhook] Error:', err);
    // Always return 200 to Razorpay to prevent retries on our errors
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
});
