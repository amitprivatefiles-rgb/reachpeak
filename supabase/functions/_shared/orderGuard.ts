/**
 * OrderGuard — shared module for order lifecycle tracking + risk scoring.
 * Used by ingest-event (via eventPipeline) and shopify-webhook.
 *
 * Three responsibilities:
 * 1. applyOrderEvent — maps events → orders upsert/update
 * 2. scoreOrder — deterministic risk scoring with explainable factors
 * 3. applyOutcome — terminal status feedback → customer_stats + pincode_stats
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// ─── Types ───

export interface RiskFactor {
  factor: string;
  points: number;
  detail: string;
}

export interface ScoreResult {
  score: number;
  band: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
}

interface OrderRow {
  id: string;
  user_id: string;
  source: string;
  external_order_id: string;
  contact_phone: string | null;
  total: number | null;
  is_cod: boolean;
  address_pincode: string | null;
  address_line: string | null;
  status: string;
  closed_at: string | null;
  confirm_status: string | null;
  payment_method: string | null;
}

interface CustomerStatsRow {
  total_orders: number;
  delivered: number;
  rto: number;
  cancelled: number;
  cod_orders: number;
  prepaid_orders: number;
  total_value: number;
  cod_confirms: number;
  cod_declines: number;
  cod_ignores: number;
}

interface PincodeStatsRow {
  orders: number;
  delivered: number;
  rto: number;
}

interface OGSettings {
  enabled: boolean;
  score_cod_only: boolean;
  low_max: number;
  medium_max: number;
}

// ─── 1. Apply Order Event ───

const TERMINAL_STATUSES = new Set(['delivered', 'rto', 'returned', 'refunded', 'cancelled', 'cancelled_by_customer']);

export async function applyOrderEvent(
  db: SupabaseClient,
  userId: string,
  source: string,
  eventType: string,
  payload: Record<string, any>,
  contactPhone: string | null,
): Promise<OrderRow | null> {
  const orderId = payload.order_id || payload.external_order_id;
  if (!orderId) return null; // lifecycle events require order_id

  const now = new Date().toISOString();

  if (eventType === 'order_created') {
    // Upsert — create or update
    const isCod = !!(payload.cod || payload.is_cod ||
      (payload.payment_method && /cod|cash/i.test(payload.payment_method)));

    // Resolve contact_id
    let contactId: string | null = null;
    if (contactPhone) {
      const { data: contact } = await db.from('contacts')
        .select('id').eq('user_id', userId).eq('phone_number', contactPhone)
        .limit(1).maybeSingle();
      contactId = contact?.id ?? null;
    }

    const orderData = {
      user_id: userId,
      source,
      external_order_id: String(orderId),
      contact_id: contactId,
      contact_phone: contactPhone,
      total: payload.total ?? null,
      currency: payload.currency ?? 'INR',
      payment_method: payload.payment_method ?? (isCod ? 'cod' : null),
      is_cod: isCod,
      items: payload.items ?? [],
      address_line: payload.address?.line ?? payload.address_line ?? null,
      address_city: payload.address?.city ?? payload.address_city ?? null,
      address_state: payload.address?.state ?? payload.address_state ?? null,
      address_pincode: payload.address?.pincode ?? payload.address_pincode ?? null,
      status: 'created',
      updated_at: now,
    };

    const { data: order, error } = await db.from('orders')
      .upsert(orderData, { onConflict: 'user_id,source,external_order_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[orderGuard] order upsert error:', error.message);
      return null;
    }
    return order;
  }

  // All other lifecycle events — update existing order
  const statusMap: Record<string, { status: string; tsField?: string }> = {
    order_confirmed: { status: 'confirmed', tsField: 'confirmed_at' },
    order_paid: { status: 'confirmed' }, // payment upgrade
    order_shipped: { status: 'shipped', tsField: 'shipped_at' },
    order_delivered: { status: 'delivered', tsField: 'delivered_at' },
    order_cancelled: { status: 'cancelled' },
    order_rto: { status: 'rto' },
    order_returned: { status: 'returned' },
    order_refunded: { status: 'refunded' },
    cod_pending: { status: 'created' }, // no status change, just triggers scoring
  };

  const mapping = statusMap[eventType];
  if (!mapping) return null;

  // Find the order
  const { data: existing } = await db.from('orders')
    .select('*')
    .eq('user_id', userId)
    .eq('source', source)
    .eq('external_order_id', String(orderId))
    .maybeSingle();

  if (!existing) {
    // Order doesn't exist yet — for cod_pending, create it
    if (eventType === 'cod_pending') {
      return applyOrderEvent(db, userId, source, 'order_created', payload, contactPhone);
    }
    return null;
  }

  const updates: Record<string, any> = { updated_at: now };

  // Don't regress terminal statuses
  if (TERMINAL_STATUSES.has(existing.status) && eventType !== 'order_refunded') {
    return existing;
  }

  if (eventType !== 'cod_pending') {
    updates.status = mapping.status;
  }

  if (mapping.tsField) {
    updates[mapping.tsField] = now;
  }

  // Terminal statuses get closed_at
  if (TERMINAL_STATUSES.has(mapping.status) && !existing.closed_at) {
    updates.closed_at = now;
  }

  // Payment upgrade
  if (eventType === 'order_paid' && existing.is_cod) {
    updates.is_cod = false;
    updates.payment_method = payload.payment_method || 'prepaid';
  }

  const { data: updated, error } = await db.from('orders')
    .update(updates)
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) {
    console.error('[orderGuard] order update error:', error.message);
    return existing;
  }

  // Apply outcome on terminal status
  if (TERMINAL_STATUSES.has(mapping.status) && !existing.closed_at) {
    await applyOutcome(db, updated);
  }

  return updated;
}

// ─── 2. Score Order ───

export async function scoreOrder(
  db: SupabaseClient,
  order: OrderRow,
  settings: OGSettings,
): Promise<ScoreResult> {
  const factors: RiskFactor[] = [];
  let score = 30; // base

  // Load customer stats
  let custStats: CustomerStatsRow | null = null;
  if (order.contact_phone) {
    const { data } = await db.from('customer_stats')
      .select('*')
      .eq('user_id', order.user_id)
      .eq('contact_phone', order.contact_phone)
      .maybeSingle();
    custStats = data;
  }

  // Load pincode stats
  let pinStats: PincodeStatsRow | null = null;
  if (order.address_pincode) {
    const { data } = await db.from('pincode_stats')
      .select('*')
      .eq('user_id', order.user_id)
      .eq('pincode', order.address_pincode)
      .maybeSingle();
    pinStats = data;
  }

  // Load WhatsApp signals
  let isBlacklisted = false;
  if (order.contact_phone) {
    const { data: contact } = await db.from('contacts')
      .select('is_blacklisted')
      .eq('user_id', order.user_id)
      .eq('phone_number', order.contact_phone)
      .maybeSingle();
    isBlacklisted = contact?.is_blacklisted === true;
  }

  // ── Factor: Payment ──
  if (order.is_cod) {
    score += 15;
    factors.push({ factor: 'COD Payment', points: 15, detail: 'Cash on delivery increases risk' });
  }

  // ── Factor: First-time customer ──
  const priorOrders = custStats?.total_orders ?? 0;
  if (priorOrders === 0) {
    score += 15;
    factors.push({ factor: 'First-time Customer', points: 15, detail: 'No prior order history' });
  }

  // ── Factor: Prior RTO rate ──
  if (custStats && priorOrders >= 2) {
    const rtoRate = custStats.rto / priorOrders;
    if (rtoRate >= 0.5) {
      score += 30;
      factors.push({ factor: 'High RTO History', points: 30, detail: `${(rtoRate * 100).toFixed(0)}% RTO rate (${custStats.rto}/${priorOrders})` });
    } else if (rtoRate >= 0.2) {
      score += 15;
      factors.push({ factor: 'Moderate RTO History', points: 15, detail: `${(rtoRate * 100).toFixed(0)}% RTO rate (${custStats.rto}/${priorOrders})` });
    }
  }

  // ── Factor: Good track record ──
  if (custStats && custStats.delivered >= 3 && custStats.rto === 0) {
    score -= 20;
    factors.push({ factor: 'Trusted Customer', points: -20, detail: `${custStats.delivered} delivered, 0 RTO` });
  }

  // ── Factor: High cancel rate ──
  if (custStats && priorOrders >= 2) {
    const cancelRate = custStats.cancelled / priorOrders;
    if (cancelRate >= 0.4) {
      score += 10;
      factors.push({ factor: 'High Cancel Rate', points: 10, detail: `${(cancelRate * 100).toFixed(0)}% cancel rate` });
    }
  }

  // ── Factor: WhatsApp — prior COD confirm ──
  if (custStats && custStats.cod_confirms > 0) {
    score -= 10;
    factors.push({ factor: 'Prior COD Confirm', points: -10, detail: `Confirmed ${custStats.cod_confirms} COD order(s) via WhatsApp` });
  }

  // ── Factor: WhatsApp — prior COD decline ──
  if (custStats && custStats.cod_declines > 0) {
    score += 10;
    factors.push({ factor: 'Prior COD Decline', points: 10, detail: `Declined ${custStats.cod_declines} COD order(s)` });
  }

  // ── Factor: WhatsApp — ignored COD prompt ──
  if (custStats && custStats.cod_ignores > 0) {
    score += 15;
    factors.push({ factor: 'Ignored COD Prompt', points: 15, detail: `No response to ${custStats.cod_ignores} COD prompt(s)` });
  }

  // ── Factor: WhatsApp — blacklisted ──
  if (isBlacklisted) {
    score += 25;
    factors.push({ factor: 'Blacklisted Contact', points: 25, detail: 'Contact is on the blacklist' });
  }

  // ── Factor: Order value spike ──
  if (custStats && priorOrders > 0 && order.total) {
    const avgValue = Number(custStats.total_value) / priorOrders;
    if (avgValue > 0 && Number(order.total) > 2 * avgValue) {
      score += 10;
      factors.push({ factor: 'Value Spike', points: 10, detail: `₹${order.total} is >2× avg ₹${avgValue.toFixed(0)}` });
    }
  }

  // ── Factor: High-value first-time ──
  if (priorOrders === 0 && order.total && Number(order.total) > 3000) {
    score += 10;
    factors.push({ factor: 'High-Value First Order', points: 10, detail: `₹${order.total} from first-time customer` });
  }

  // ── Factor: Missing/invalid pincode ──
  if (!order.address_pincode || !/^\d{6}$/.test(order.address_pincode)) {
    score += 15;
    factors.push({ factor: 'Invalid Pincode', points: 15, detail: order.address_pincode ? `"${order.address_pincode}" is not 6 digits` : 'Pincode missing' });
  }

  // ── Factor: Short address ──
  if (order.address_line && order.address_line.length < 20) {
    score += 10;
    factors.push({ factor: 'Short Address', points: 10, detail: `Address is only ${order.address_line.length} chars` });
  }

  // ── Factor: Pincode RTO rate (tenant-specific) ──
  if (pinStats && pinStats.orders >= 5) {
    const pinRtoRate = pinStats.rto / pinStats.orders;
    if (pinRtoRate >= 0.4) {
      score += 15;
      factors.push({ factor: 'High-RTO Pincode', points: 15, detail: `${(pinRtoRate * 100).toFixed(0)}% RTO in pincode ${order.address_pincode} (${pinStats.rto}/${pinStats.orders})` });
    } else if (pinRtoRate <= 0.1) {
      score -= 10;
      factors.push({ factor: 'Low-RTO Pincode', points: -10, detail: `${(pinRtoRate * 100).toFixed(0)}% RTO in pincode ${order.address_pincode}` });
    }
  }

  // ── Factor: External risk_score blend ──
  // Loaded from the event payload if the store provided its own score
  // This is applied after our score is computed — we blend 50/50

  // Clamp before blend
  score = Math.max(0, Math.min(100, score));

  // Determine band
  const band: 'low' | 'medium' | 'high' =
    score <= settings.low_max ? 'low' :
    score <= settings.medium_max ? 'medium' : 'high';

  return { score, band, factors };
}

/**
 * Blend external risk_score if provided. Call AFTER scoreOrder.
 * PeakCart is authoritative — its score wins outright for source='peakcart'.
 * Other sources keep the existing 50/50 blend.
 */
export function blendExternalScore(
  result: ScoreResult,
  externalScore: number | undefined,
  source?: string,
): ScoreResult {
  if (externalScore === undefined || externalScore === null) return result;
  const ext = Number(externalScore);

  if (source === 'peakcart') {
    // PeakCart has a 6-signal engine; its score replaces ours
    result.factors.push({
      factor: 'PeakCart Score (authoritative)',
      points: ext - result.score,
      detail: `PeakCart score ${ext} replaces ReachPeak score ${result.score}`,
    });
    result.score = Math.max(0, Math.min(100, ext));
    return result;
  }

  // Other sources: 50/50 blend (existing behaviour)
  const blended = Math.round(0.5 * result.score + 0.5 * ext);
  result.factors.push({
    factor: 'External Score Blend',
    points: blended - result.score,
    detail: `Store score ${ext}, ours ${result.score} → blended ${blended}`,
  });
  result.score = Math.max(0, Math.min(100, blended));
  return result;
}

// ─── 3. Apply Outcome (feedback loop) ───

export async function applyOutcome(
  db: SupabaseClient,
  order: OrderRow,
): Promise<void> {
  // Guard: only apply once (closed_at must have just been set)
  if (!order.contact_phone) return;

  const now = new Date().toISOString();

  // Increment customer_stats
  const incCol: Record<string, number> = { total_orders: 1 };
  if (order.status === 'delivered') incCol.delivered = 1;
  if (order.status === 'rto') incCol.rto = 1;
  if (['cancelled', 'cancelled_by_customer'].includes(order.status)) incCol.cancelled = 1;
  if (order.is_cod) incCol.cod_orders = 1;
  else incCol.prepaid_orders = 1;

  // COD confirm outcome
  if (order.confirm_status === 'confirmed') incCol.cod_confirms = 1;
  if (order.confirm_status === 'declined') incCol.cod_declines = 1;
  if (order.confirm_status === 'no_response') incCol.cod_ignores = 1;

  // Upsert customer_stats
  const { data: existing } = await db.from('customer_stats')
    .select('*')
    .eq('user_id', order.user_id)
    .eq('contact_phone', order.contact_phone)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, any> = { updated_at: now };
    for (const [col, inc] of Object.entries(incCol)) {
      updates[col] = (existing[col as keyof typeof existing] as number ?? 0) + inc;
    }
    updates.total_value = Number(existing.total_value ?? 0) + Number(order.total ?? 0);
    updates.last_order_at = now;
    await db.from('customer_stats')
      .update(updates)
      .eq('user_id', order.user_id)
      .eq('contact_phone', order.contact_phone);
  } else {
    const insert: Record<string, any> = {
      user_id: order.user_id,
      contact_phone: order.contact_phone,
      total_value: Number(order.total ?? 0),
      last_order_at: now,
      updated_at: now,
      ...incCol,
    };
    await db.from('customer_stats').insert(insert);
  }

  // Increment pincode_stats
  if (order.address_pincode && /^\d{6}$/.test(order.address_pincode)) {
    const { data: pinEx } = await db.from('pincode_stats')
      .select('*')
      .eq('user_id', order.user_id)
      .eq('pincode', order.address_pincode)
      .maybeSingle();

    const pinInc: Record<string, number> = { orders: 1 };
    if (order.status === 'delivered') pinInc.delivered = 1;
    if (order.status === 'rto') pinInc.rto = 1;

    if (pinEx) {
      const pinUpdates: Record<string, any> = { updated_at: now };
      for (const [col, inc] of Object.entries(pinInc)) {
        pinUpdates[col] = (pinEx[col as keyof typeof pinEx] as number ?? 0) + inc;
      }
      await db.from('pincode_stats')
        .update(pinUpdates)
        .eq('user_id', order.user_id)
        .eq('pincode', order.address_pincode);
    } else {
      await db.from('pincode_stats').insert({
        user_id: order.user_id,
        pincode: order.address_pincode,
        updated_at: now,
        ...pinInc,
      });
    }
  }
}

// ─── 4. Update order confirm status (called by journey-engine callback/timeout) ───

export async function updateOrderConfirmStatus(
  db: SupabaseClient,
  userId: string,
  source: string,
  externalOrderId: string,
  confirmStatus: 'confirmed' | 'declined' | 'no_response',
): Promise<void> {
  if (!externalOrderId) return; // skip silently if absent

  const updates: Record<string, any> = {
    confirm_status: confirmStatus,
    updated_at: new Date().toISOString(),
  };

  if (confirmStatus === 'confirmed') {
    updates.status = 'confirmed';
    updates.confirmed_at = new Date().toISOString();
  } else if (confirmStatus === 'declined') {
    updates.status = 'cancelled_by_customer';
    updates.closed_at = new Date().toISOString();
  }
  // no_response: don't change order status — let the store decide

  const { error } = await db.from('orders')
    .update(updates)
    .eq('user_id', userId)
    .match({ source, external_order_id: String(externalOrderId) });

  if (error) {
    console.error('[orderGuard] updateOrderConfirmStatus error:', error.message);
  }
}
