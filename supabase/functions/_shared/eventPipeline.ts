/**
 * Event Pipeline — shared ingestion logic used by ingest-event and shopify-webhook.
 *
 * Flow: normalizePhone → contactUpsert → eventInsert → orderGuardSequence → journeyEngineInvoke
 *
 * OrderGuard is wrapped in try-catch so scoring failures never break event ingestion.
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  applyOrderEvent,
  scoreOrder,
  blendExternalScore,
} from './orderGuard.ts';
import { createPaymentLink } from './payments.ts';
import { dispatchCallback } from './callbackDispatcher.ts';

// ── Phone normalization ──
export function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 0) return null;
  if (digits.length === 10) return '91' + digits;
  return digits;
}

// Events that trigger OrderGuard scoring
const SCORABLE_EVENTS = new Set(['order_created', 'cod_pending']);

// Events that are part of the order lifecycle
const LIFECYCLE_EVENTS = new Set([
  'order_created', 'order_confirmed', 'order_paid', 'order_shipped',
  'order_delivered', 'order_cancelled', 'order_rto', 'order_returned',
  'order_refunded', 'cod_pending',
]);

interface PipelineInput {
  userId: string;
  source: string;
  eventType: string;
  dedupeKey: string;
  phone: string | null;
  contactName: string | null;
  payload: Record<string, any>;
}

interface PipelineResult {
  ok: boolean;
  eventId?: string;
  deduped?: boolean;
  error?: string;
  riskScore?: number;
  riskBand?: string;
}

export async function runPipeline(
  db: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
  input: PipelineInput,
): Promise<PipelineResult> {
  const { userId, source, eventType, dedupeKey, phone, contactName, payload } = input;

  /* ── 1. Upsert contact ── */
  if (phone) {
    const { data: existing } = await db.from('contacts')
      .select('id').eq('user_id', userId).eq('phone_number', phone)
      .limit(1).maybeSingle();

    if (existing) {
      if (contactName) {
        await db.from('contacts')
          .update({ name: contactName, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .is('name', null);
      }
    } else {
      const { error: insertErr } = await db.from('contacts').insert({
        user_id: userId,
        phone_number: phone,
        name: contactName,
        source,
        lead_type: 'Warm',
      });
      if (insertErr && insertErr.code !== '23505') {
        console.error('[pipeline] Contact insert error:', insertErr.message);
      }
    }
  }

  /* ── 2. Normalize risk_band for cod_pending ── */
  // When PeakCart sends cod_pending with risk_level but no risk_band,
  // copy risk_level to risk_band so journey trigger_filters match.
  if (eventType === 'cod_pending' && payload.risk_level && !payload.risk_band) {
    payload.risk_band = payload.risk_level;
  }

  // Ensure order_id is set (PeakCart sends order_uuid)
  if (!payload.order_id && payload.order_uuid) {
    payload.order_id = payload.order_uuid;
  }

  /* ── 3. OrderGuard lifecycle tracking (try-catch protected) ── */
  let order: any = null;
  let scoreResult: { score: number; band: string; factors: any[] } | null = null;

  if (LIFECYCLE_EVENTS.has(eventType) && payload.order_id) {
    try {
      order = await applyOrderEvent(db, userId, source, eventType, payload, phone);

      // Score if order_created or cod_pending
      if (order && SCORABLE_EVENTS.has(eventType)) {
        const { data: settings } = await db.from('orderguard_settings')
          .select('*').eq('user_id', userId).maybeSingle();

        if (settings?.enabled) {
          let result = await scoreOrder(db, order, settings);

          // Blend external score if provided (PeakCart's score is authoritative)
          if (payload.risk_score !== undefined) {
            result = blendExternalScore(result, payload.risk_score, source);
          }

          // Determine band — 4 levels: low / medium / high / critical
          // PeakCart is authoritative: if source='peakcart' and risk_level is provided,
          // use it directly. Otherwise compute from ReachPeak thresholds.
          const criticalMin = settings.critical_min ?? 70;
          let band: string;
          if (source === 'peakcart' && payload.risk_level) {
            // PeakCart provides risk_level — use it as-is
            band = String(payload.risk_level).toLowerCase();
          } else {
            band = result.score <= settings.low_max ? 'low' :
              result.score <= settings.medium_max ? 'medium' :
              result.score >= criticalMin ? 'critical' : 'high';
          }
          result.band = band;

          // Write score to order
          await db.from('orders').update({
            risk_score: result.score,
            risk_band: result.band,
            risk_factors: result.factors,
            updated_at: new Date().toISOString(),
          }).eq('id', order.id);

          scoreResult = result;

          // Enrich payload for journey filters
          payload.risk_score = result.score;
          payload.risk_band = result.band;

          // ── Risk routing ──
          await routeByRisk(db, supabaseUrl, serviceRoleKey, userId, source, order, result, settings);
        }
      }
    } catch (err: any) {
      // Scoring failure must not break ingestion
      console.error('[pipeline] OrderGuard error (non-fatal):', err.message);
    }
  }

  /* ── 3. Insert event (idempotent dedupe) ── */
  const { data: eventRow, error: eventErr } = await db.from('events')
    .insert({
      user_id: userId,
      source,
      event_type: eventType,
      contact_phone: phone,
      contact_name: contactName,
      dedupe_key: dedupeKey,
      payload,
      status: 'received',
    })
    .select('id')
    .single();

  if (eventErr) {
    if (eventErr.code === '23505') {
      return { ok: true, deduped: true };
    }
    console.error('[pipeline] Event insert error:', eventErr.message);
    return { ok: false, error: eventErr.message };
  }

  const eventId = eventRow!.id;

  /* ── 4. Fire-and-forget → journey-engine ── */
  fetch(`${supabaseUrl}/functions/v1/journey-engine`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_id: eventId }),
  }).catch((err) => {
    console.error('[pipeline] journey-engine invoke error:', err.message);
  });

  return {
    ok: true,
    eventId,
    riskScore: scoreResult?.score,
    riskBand: scoreResult?.band,
  };
}

// ── Risk Routing ──

async function routeByRisk(
  db: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  source: string,
  order: any,
  scoreResult: { score: number; band: string; factors: any[] },
  settings: any,
): Promise<void> {
  const actionKey = `action_${scoreResult.band}` as string;
  const action: string = settings[actionKey] ?? 'none';

  // If score_cod_only and not COD, just observe (no routing action)
  const effectiveAction = (settings.score_cod_only && !order.is_cod) ? 'none' : action;

  await db.from('orders').update({
    routed_action: effectiveAction,
    updated_at: new Date().toISOString(),
  }).eq('id', order.id);

  if (effectiveAction === 'none') return;

  if (effectiveAction === 'cod_confirm') {
    await db.from('orders').update({ confirm_status: 'pending' }).eq('id', order.id);

    // Synthesize cod_pending event (journey-engine will start the COD journey)
    const dedupeKey = `cod_pending:${order.external_order_id}`;
    await db.from('events').insert({
      user_id: userId,
      source,
      event_type: 'cod_pending',
      contact_phone: order.contact_phone,
      dedupe_key: dedupeKey,
      payload: {
        ...order,
        risk_score: scoreResult.score,
        risk_band: scoreResult.band,
        order_uuid: order.external_order_id,
        order_number: order.order_number ?? order.external_order_id,
        order_id: order.external_order_id, // backward compat
      },
      status: 'received',
    }).select('id').single().then(({ data: evt }) => {
      if (evt) {
        // Fire journey-engine for the cod_pending event
        fetch(`${supabaseUrl}/functions/v1/journey-engine`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ event_id: evt.id }),
        }).catch(() => {});
      }
    }).catch(() => {}); // dedupe hit is fine

  } else if (effectiveAction === 'prepay_nudge') {
    // Try to create a real payment link via Razorpay
    const discountPct = settings.prepay_discount_pct ?? 0;
    const discountAmount = discountPct > 0 ? Math.round(Number(order.total ?? 0) * discountPct / 100) : 0;

    let payUrl: string | null = null;
    let discountedTotal: number | null = null;
    let paymentLinkId: string | null = null;

    try {
      const linkResult = await createPaymentLink(db, userId, {
        orderId: order.id,
        orderExternalId: order.external_order_id,
        contactPhone: order.contact_phone,
        amount: Number(order.total ?? 0),
        discount: discountAmount,
        source: 'prepay_nudge',
      });

      if (linkResult.ok && linkResult.payUrl) {
        payUrl = linkResult.payUrl;
        discountedTotal = linkResult.amount ?? null;
        paymentLinkId = linkResult.paymentLinkId ?? null;
      } else {
        console.log(`[pipeline] prepay_nudge: link creation failed (${linkResult.error}), falling back to cod_confirm`);
      }
    } catch (err: any) {
      console.log(`[pipeline] prepay_nudge: link creation error (${err.message}), falling back to cod_confirm`);
    }

    if (!payUrl) {
      // No payment link — fall back to cod_confirm
      await db.from('orders').update({
        routed_action: 'cod_confirm',
        confirm_status: 'pending',
      }).eq('id', order.id);

      const dedupeKey = `cod_pending:${order.external_order_id}`;
      await db.from('events').insert({
        user_id: userId, source,
        event_type: 'cod_pending',
        contact_phone: order.contact_phone,
        dedupe_key: dedupeKey,
        payload: { ...order, risk_score: scoreResult.score, risk_band: scoreResult.band, order_uuid: order.external_order_id, order_number: order.order_number ?? order.external_order_id, order_id: order.external_order_id },
        status: 'received',
      }).select('id').single().then(({ data: evt }) => {
        if (evt) {
          fetch(`${supabaseUrl}/functions/v1/journey-engine`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_id: evt.id }),
          }).catch(() => {});
        }
      }).catch(() => {});
      return;
    }

    // Synthesize prepay_nudge event with real pay_url
    const dedupeKey = `prepay_nudge:${order.external_order_id}`;
    await db.from('events').insert({
      user_id: userId, source,
      event_type: 'prepay_nudge',
      contact_phone: order.contact_phone,
      dedupe_key: dedupeKey,
      payload: {
        order_uuid: order.external_order_id,
        order_number: order.order_number ?? order.external_order_id,
        order_id: order.external_order_id, // backward compat
        total: order.total,
        pay_url: payUrl,
        discounted_total: discountedTotal,
        discount: discountAmount,
        payment_link_id: paymentLinkId,
        risk_score: scoreResult.score,
        risk_band: scoreResult.band,
      },
      status: 'received',
    }).select('id').single().then(({ data: evt }) => {
      if (evt) {
        fetch(`${supabaseUrl}/functions/v1/journey-engine`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: evt.id }),
        }).catch(() => {});
      }
    }).catch(() => {});

  } else if (effectiveAction === 'hold') {
    // Optionally POST hold decision to integration callback
    if (settings.hold_callback) {
      const { data: intKey } = await db.from('integration_keys')
        .select('callback_url, callback_secret')
        .eq('user_id', userId).eq('is_active', true)
        .limit(1).maybeSingle();

      if (intKey?.callback_url && intKey?.callback_secret) {
        await dispatchCallback(db, userId, intKey.callback_url, intKey.callback_secret, {
          callback_id: crypto.randomUUID(),
          type: 'action',
          action: 'order.hold',
          external_ref: {
            type: 'order',
            id: order.external_order_id,
            store_ref: null,
          },
          order_uuid: order.external_order_id,
          order_number: order.order_number ?? order.external_order_id,
          risk_score: scoreResult.score,
          risk_band: scoreResult.band,
          phone: order.contact_phone,
          occurred_at: new Date().toISOString(),
        });
      }
    }
  }
}
