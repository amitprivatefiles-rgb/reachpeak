/**
 * callbackDispatcher.ts — Reliable callback delivery with exponential backoff.
 *
 * - Logs every callback to `callback_log` table
 * - On 200 from partner: marks as acked
 * - On failure: schedules retry with exponential backoff (5s, 30s, 2m, 10m, 1h)
 * - After 8 attempts: marks as failed_permanent
 * - Reconciliation: partner can poll for unacked callbacks
 *
 * Callback shapes are UNIFIED:
 *   {
 *     callback_id, type ('action' | 'message_status'),
 *     external_ref: { type, id, store_ref },
 *     ...type-specific fields
 *   }
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Retry delays in milliseconds: 5s, 30s, 2m, 10m, 30m, 1h, 2h, 4h
const RETRY_DELAYS_MS = [
  5_000, 30_000, 120_000, 600_000, 1_800_000, 3_600_000, 7_200_000, 14_400_000,
];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1; // first attempt + retries

async function hmacSign(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface CallbackPayload {
  callback_id: string;
  type: 'action' | 'message_status';
  external_ref: {
    type: string | null;
    id: string | null;
    store_ref: string | null;
  };
  [key: string]: unknown;
}

/**
 * Dispatch a callback with retry. Logs to callback_log, attempts delivery,
 * schedules retry on failure.
 */
export async function dispatchCallback(
  db: SupabaseClient,
  userId: string,
  callbackUrl: string,
  callbackSecret: string,
  payload: CallbackPayload,
): Promise<void> {
  const callbackId = payload.callback_id;
  const bodyStr = JSON.stringify(payload);

  // Log to callback_log (first attempt)
  await db.from('callback_log').upsert({
    user_id: userId,
    callback_id: callbackId,
    type: payload.type,
    payload,
    status: 'pending',
    attempts: 1,
    last_attempt_at: new Date().toISOString(),
  }, { onConflict: 'callback_id' });

  // Attempt delivery
  try {
    const signature = await hmacSign(callbackSecret, bodyStr);
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ReachPeak-Signature': signature,
        'X-ReachPeak-Callback-Id': callbackId,
        'X-ReachPeak-Timestamp': new Date().toISOString(),
      },
      body: bodyStr,
    });

    if (res.ok) {
      // Partner ACKed — mark delivered
      await db.from('callback_log').update({
        status: 'delivered',
        acked_at: new Date().toISOString(),
      }).eq('callback_id', callbackId);
      return;
    }

    // Non-2xx — schedule retry
    console.warn(`[callback] ${callbackId} failed (HTTP ${res.status}), scheduling retry`);
  } catch (err: any) {
    console.error(`[callback] ${callbackId} delivery error: ${err.message}`);
  }

  // Schedule first retry
  const nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[0]).toISOString();
  await db.from('callback_log').update({
    next_retry_at: nextRetryAt,
  }).eq('callback_id', callbackId);
}

/**
 * Retry pending callbacks. Called by pg_cron or a scheduled function.
 * Processes up to `limit` callbacks that are due for retry.
 */
export async function retryPendingCallbacks(
  db: SupabaseClient,
  limit = 50,
): Promise<{ processed: number; delivered: number; failed: number }> {
  const now = new Date().toISOString();

  const { data: pending } = await db.from('callback_log')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', now)
    .order('next_retry_at', { ascending: true })
    .limit(limit);

  if (!pending || pending.length === 0) return { processed: 0, delivered: 0, failed: 0 };

  let delivered = 0;
  let failed = 0;

  for (const cb of pending) {
    const attempt = cb.attempts + 1;

    // Load integration key for this user
    const { data: intKey } = await db.from('integration_keys')
      .select('callback_url, callback_secret')
      .eq('user_id', cb.user_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!intKey?.callback_url || !intKey?.callback_secret) {
      // No callback config — mark as permanent failure
      await db.from('callback_log').update({
        status: 'failed_permanent',
        attempts: attempt,
        last_attempt_at: now,
      }).eq('id', cb.id);
      failed++;
      continue;
    }

    const bodyStr = JSON.stringify(cb.payload);

    try {
      const signature = await hmacSign(intKey.callback_secret, bodyStr);
      const res = await fetch(intKey.callback_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ReachPeak-Signature': signature,
          'X-ReachPeak-Callback-Id': cb.callback_id,
          'X-ReachPeak-Timestamp': now,
        },
        body: bodyStr,
      });

      if (res.ok) {
        await db.from('callback_log').update({
          status: 'delivered',
          acked_at: now,
          attempts: attempt,
          last_attempt_at: now,
        }).eq('id', cb.id);
        delivered++;
        continue;
      }
    } catch (err: any) {
      console.error(`[callback-retry] ${cb.callback_id} attempt ${attempt} error: ${err.message}`);
    }

    // Still failing — schedule next retry or give up
    if (attempt >= MAX_ATTEMPTS) {
      await db.from('callback_log').update({
        status: 'failed_permanent',
        attempts: attempt,
        last_attempt_at: now,
      }).eq('id', cb.id);
      failed++;
      console.error(`[callback-retry] ${cb.callback_id} permanently failed after ${attempt} attempts`);
    } else {
      const delayIdx = Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1);
      const nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[delayIdx]).toISOString();
      await db.from('callback_log').update({
        attempts: attempt,
        last_attempt_at: now,
        next_retry_at: nextRetryAt,
      }).eq('id', cb.id);
    }
  }

  return { processed: pending.length, delivered, failed };
}
