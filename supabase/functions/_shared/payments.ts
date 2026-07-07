/**
 * Payments — shared module for Razorpay payment link creation.
 * Used by create-payment-link edge function and eventPipeline.
 *
 * Secrets decrypted via Supabase Vault (get_vault_secret RPC, service-role only).
 * DB-side idempotency via partial unique index on payment_links(order_id)
 * where status in ('created','paid'). No Razorpay idempotency header.
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// ─── Types ───

export interface CreatePaymentLinkInput {
  orderId?: string;       // orders.id (uuid) — may be null for standalone
  orderExternalId?: string; // external order id for description
  contactPhone: string;
  amount: number;         // in rupees (will be converted to paise)
  currency?: string;
  description?: string;
  discount?: number;      // discount amount in rupees (already computed)
  source: string;         // 'prepay_nudge' | 'inbox' | 'journey'
  journeyExecutionId?: string;
}

export interface CreatePaymentLinkResult {
  ok: boolean;
  payUrl?: string;
  paymentLinkId?: string;
  rzpPlinkId?: string;
  amount?: number;        // final amount (after discount) in rupees
  error?: string;
  existing?: boolean;     // true if returned an existing link
}

// ─── Vault Decryption ───

async function decryptVaultSecret(
  db: SupabaseClient,
  vaultId: string,
): Promise<string | null> {
  const { data, error } = await db.rpc('get_vault_secret', { secret_id: vaultId });
  if (error) {
    console.error('[payments] Vault decrypt error:', error.message);
    return null;
  }
  return data;
}

// ─── Main: Create Payment Link ───

export async function createPaymentLink(
  db: SupabaseClient,
  userId: string,
  input: CreatePaymentLinkInput,
): Promise<CreatePaymentLinkResult> {
  // 1. Load tenant's payment provider
  const { data: provider, error: provErr } = await db
    .from('payment_providers')
    .select('id, user_id, provider, key_id, key_secret_enc, mode, is_active')
    .eq('user_id', userId)
    .eq('provider', 'razorpay')
    .eq('is_active', true)
    .maybeSingle();

  if (provErr || !provider) {
    return { ok: false, error: 'no_payment_provider' };
  }

  // 2. Decrypt key_secret from Vault
  const keySecret = await decryptVaultSecret(db, provider.key_secret_enc);
  if (!keySecret) {
    return { ok: false, error: 'Failed to decrypt payment provider secret' };
  }

  // 3. Idempotency: check existing active link for this order
  if (input.orderId) {
    const { data: existing } = await db
      .from('payment_links')
      .select('id, short_url, amount, status, rzp_plink_id')
      .eq('order_id', input.orderId)
      .in('status', ['created', 'paid'])
      .maybeSingle();

    if (existing) {
      return {
        ok: true,
        payUrl: existing.short_url,
        paymentLinkId: existing.id,
        rzpPlinkId: existing.rzp_plink_id,
        amount: Number(existing.amount),
        existing: true,
      };
    }
  }

  // 4. Compute final amount
  const discountAmount = input.discount ?? 0;
  const finalAmount = Math.max(1, input.amount - discountAmount); // min ₹1
  const amountPaise = Math.round(finalAmount * 100);

  // 5. Build Razorpay request — mode determines which keys are used
  //    test keys (rzp_test_...) only create test-mode links; live keys create live links
  const plId = crypto.randomUUID();
  const description = input.description ||
    `Payment for Order ${input.orderExternalId || ''}`.trim();

  const rzpBody = {
    amount: amountPaise,
    currency: input.currency || 'INR',
    description,
    customer: {
      contact: `+${input.contactPhone}`,
    },
    notify: { sms: false, email: false },
    reminder_enable: true,
    notes: {
      reachpeak_order_id: input.orderExternalId || '',
      user_id: userId,
      pl_id: plId,
    },
  };

  // 6. Call Razorpay API (Basic auth: key_id:key_secret)
  //    Test keys (rzp_test_*) only create test links; live keys (rzp_live_*) create live links
  //    — this is enforced by Razorpay itself, not by us
  const rzpUrl = 'https://api.razorpay.com/v1/payment_links';
  const basicAuth = btoa(`${provider.key_id}:${keySecret}`);

  let rzpResponse: any;
  try {
    const resp = await fetch(rzpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rzpBody),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('[payments] Razorpay API error:', resp.status, errBody);
      return { ok: false, error: `Razorpay error: ${resp.status}` };
    }

    rzpResponse = await resp.json();
  } catch (err: any) {
    console.error('[payments] Razorpay fetch error:', err.message);
    return { ok: false, error: err.message };
  }

  const rzpPlinkId = rzpResponse.id;       // 'plink_...'
  const shortUrl = rzpResponse.short_url;  // the pay link

  // 7. Store payment_links row
  const { error: insertErr } = await db.from('payment_links').insert({
    id: plId,
    user_id: userId,
    order_id: input.orderId || null,
    contact_phone: input.contactPhone,
    provider: 'razorpay',
    rzp_plink_id: rzpPlinkId,
    short_url: shortUrl,
    amount: finalAmount,
    currency: input.currency || 'INR',
    description,
    status: 'created',
    meta: {
      source: input.source,
      journey_execution_id: input.journeyExecutionId || null,
      discount: discountAmount > 0 ? discountAmount : null,
    },
  });

  if (insertErr) {
    // 23505 = partial unique index violation — concurrent duplicate for same order
    if (insertErr.code === '23505' && input.orderId) {
      const { data: existing } = await db.from('payment_links')
        .select('id, short_url, amount, rzp_plink_id')
        .eq('order_id', input.orderId)
        .in('status', ['created', 'paid'])
        .maybeSingle();
      if (existing) {
        return {
          ok: true, payUrl: existing.short_url, paymentLinkId: existing.id,
          rzpPlinkId: existing.rzp_plink_id, amount: Number(existing.amount), existing: true,
        };
      }
    }
    console.error('[payments] payment_links insert error:', insertErr.message);
    return { ok: false, error: insertErr.message };
  }

  // 8. Link order to payment link
  if (input.orderId) {
    await db.from('orders').update({
      payment_link_id: plId,
      updated_at: new Date().toISOString(),
    }).eq('id', input.orderId);
  }

  console.log(`[payments] Created link: pl=${plId} rzp=${rzpPlinkId} amount=₹${finalAmount} phone=${input.contactPhone}`);
  return { ok: true, payUrl: shortUrl, paymentLinkId: plId, rzpPlinkId, amount: finalAmount };
}
