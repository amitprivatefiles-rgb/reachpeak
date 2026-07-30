// Supabase Edge Function: journey-engine
// Event-triggered journey automation engine.
// Entry points: new event, cron wake, inbound button reply.
// Sends ENQUEUE into messages (worker claims + sends). Never calls Graph API directly.
//
// Security: Only callable with service-role key.
// Deploy: supabase functions deploy journey-engine --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildTemplateSendComponents } from '../_shared/templatePayload.ts';
import type { StoredTemplate } from '../_shared/templatePayload.ts';
import { updateOrderConfirmStatus } from '../_shared/orderGuard.ts';
import { createPaymentLink } from '../_shared/payments.ts';
import { dispatchCallback } from '../_shared/callbackDispatcher.ts';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_STEPS     = 25;

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ───

function resolveBinding(binding: string, context: Record<string, any>): string {
  // Supports "contact.name", "payload.cart_total", "payload.items[0].title"
  const parts = binding.split('.');
  let val: any = context;
  for (const part of parts) {
    if (val === null || val === undefined) break;
    val = val[part];
  }
  // Fallback: if top-level lookup failed and binding has no dots,
  // check context.payload.{binding} (convenience for journey step authors)
  if ((val === null || val === undefined) && !binding.includes('.') && context.payload) {
    val = context.payload[binding];
  }
  return String(val ?? '');
}

async function resolveConversation(
  userId: string, accountId: string, phone: string, preview: string,
): Promise<string | null> {
  try {
    const { data: existing } = await db
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('contact_phone', phone)
      .maybeSingle();
    if (existing) return existing.id;

    const { data: newConv, error } = await db
      .from('conversations')
      .insert({
        user_id: userId,
        whatsapp_account_id: accountId,
        contact_phone: phone,
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
        last_message_direction: 'outbound',
        unread_count: 0,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: retry } = await db
          .from('conversations').select('id')
          .eq('user_id', userId).eq('contact_phone', phone).maybeSingle();
        return retry?.id || null;
      }
      console.error('[journey-engine] resolveConversation error:', error.message);
      return null;
    }
    return newConv?.id || null;
  } catch (e: any) {
    console.error('[journey-engine] resolveConversation error:', e.message);
    return null;
  }
}

async function isBlacklisted(userId: string, phone: string): Promise<boolean> {
  const { data } = await db.from('contacts')
    .select('is_blacklisted')
    .eq('user_id', userId)
    .eq('phone_number', phone)
    .limit(1)
    .maybeSingle();
  return data?.is_blacklisted === true;
}

// ─── Pre-Send Gate (A1.7) ───
// Called before every journey message enqueue. Checks in order:
// 1. Opted out → abort
// 2. Goal already met (state re-check) → abort as exited_goal
// 3. Human conversation active → defer
// 4. Quiet hours → defer
// 5. Frequency cap → defer
// 6. Defer expiry (>7 days total) → abort
// 7. Else → send

type GateResult =
  | { action: 'send' }
  | { action: 'abort'; reason: string; status: 'exited_goal' | 'cancelled' }
  | { action: 'defer'; reason: string; deferUntil: string };

const MAX_DEFER_MINUTES = 7 * 24 * 60; // 7 days

async function evaluateSendGate(
  exec: any,
  journey: any,
): Promise<GateResult> {
  // 1. OPT-OUT / BLACKLIST CHECK
  const { data: contact } = await db.from('contacts')
    .select('is_blacklisted, blacklist_reason, opted_out_at')
    .eq('user_id', exec.user_id)
    .eq('phone_number', exec.contact_phone)
    .maybeSingle();
  if (contact?.is_blacklisted || contact?.opted_out_at)
    return { action: 'abort', reason: `opted_out (${contact.blacklist_reason || 'blacklisted'})`, status: 'cancelled' };

  // 2. GOAL ALREADY MET — synchronous state re-check (A1.2)
  const goalReason = await checkGoalAlreadyMet(exec, journey);
  if (goalReason)
    return { action: 'abort', reason: goalReason, status: 'exited_goal' };

  // 3. HUMAN CONVERSATION ACTIVE (A1.4)
  const { data: conv } = await db.from('conversations')
    .select('human_active_until')
    .eq('user_id', exec.user_id)
    .eq('contact_phone', exec.contact_phone)
    .maybeSingle();
  if (conv?.human_active_until && new Date(conv.human_active_until) > new Date())
    return { action: 'defer', reason: 'human_active', deferUntil: conv.human_active_until };

  // 4. QUIET HOURS (A1.6) — respects journey.respects_quiet_hours flag
  if (journey.respects_quiet_hours !== false) {
    const quietDefer = await checkQuietHours(exec.user_id);
    if (quietDefer)
      return { action: 'defer', reason: 'quiet_hours', deferUntil: quietDefer };
  }

  // 5. FREQUENCY CAP (A1.5)
  const capDefer = await checkFrequencyCap(exec);
  if (capDefer)
    return { action: 'defer', reason: 'frequency_cap', deferUntil: capDefer };

  // 6. DEFER EXPIRY — if total deferred > 7 days, abort
  if ((exec.total_deferred_minutes || 0) > MAX_DEFER_MINUTES)
    return { action: 'abort', reason: 'defer_expired', status: 'cancelled' };

  return { action: 'send' };
}

// ── A1.2: State re-check — is the journey's goal already met? ──
async function checkGoalAlreadyMet(exec: any, journey: any): Promise<string | null> {
  const orderId = exec.context?.payload?.order_id;
  if (!orderId) return null; // No order linkage — event exit-pass still covers it

  // Look up the order by external_order_id within the tenant
  const { data: order } = await db.from('orders')
    .select('status, confirm_status, converted_to_prepaid')
    .eq('user_id', exec.user_id)
    .eq('external_order_id', String(orderId))
    .limit(1)
    .maybeSingle();
  if (!order) return null; // Order not found — can't check, proceed

  const preset = journey.preset;

  // Cart / prepay / payment journeys → order paid/confirmed/cancelled/delivered
  if (preset === 'abandoned_cart' || preset === 'prepay_nudge') {
    if (['paid', 'confirmed', 'cancelled', 'delivered'].includes(order.status)
        || order.converted_to_prepaid)
      return `goal_met:order_${order.status}${order.converted_to_prepaid ? '_prepaid' : ''}`;
  }

  // COD confirmation → confirm_status already set
  if (preset === 'cod_confirm' && order.confirm_status)
    return `goal_met:already_${order.confirm_status}`;

  // Review request (triggered by order_delivered) → returned/refunded
  if (journey.trigger_event === 'order_delivered') {
    if (['returned', 'refunded'].includes(order.status))
      return `goal_met:order_${order.status}`;
  }

  // Order shipped → returned/cancelled
  if (journey.trigger_event === 'order_shipped') {
    if (['returned', 'cancelled'].includes(order.status))
      return `goal_met:order_${order.status}`;
  }

  return null;
}

// ── A1.6: Quiet hours check — returns ISO deferUntil or null ──
// Reads from orderguard_settings (existing schema). Handles missing row gracefully.
async function checkQuietHours(userId: string): Promise<string | null> {
  const { data: ogSettings } = await db.from('orderguard_settings')
    .select('quiet_hours_start, quiet_hours_end, quiet_hours_tz')
    .eq('user_id', userId)
    .maybeSingle();

  // No settings row or no quiet hours configured → no restriction
  if (!ogSettings?.quiet_hours_start || !ogSettings?.quiet_hours_end) return null;

  const tz = ogSettings.quiet_hours_tz || 'Asia/Kolkata';
  const nowLocal = new Date().toLocaleString('en-US', { timeZone: tz });
  const localDate = new Date(nowLocal);
  const localHHMM = localDate.getHours() * 60 + localDate.getMinutes();

  const [startH, startM] = ogSettings.quiet_hours_start.split(':').map(Number);
  const [endH, endM] = ogSettings.quiet_hours_end.split(':').map(Number);
  const quietStart = startH * 60 + startM;
  const quietEnd = endH * 60 + endM;

  // Check if current time is in quiet hours (handles overnight wrap)
  const inQuietHours = quietStart > quietEnd
    ? (localHHMM >= quietStart || localHHMM < quietEnd)  // e.g. 22:00-08:00
    : (localHHMM >= quietStart && localHHMM < quietEnd); // e.g. 01:00-06:00

  if (!inQuietHours) return null;

  // Calculate wake time: next occurrence of quiet_hours_end in the tenant's tz
  const tomorrow = new Date(localDate);
  if (localHHMM >= quietStart) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  }
  tomorrow.setHours(endH, endM, 0, 0);

  // Convert back from local tz to UTC
  const offsetMs = new Date().getTime() - localDate.getTime();
  return new Date(tomorrow.getTime() + offsetMs).toISOString();
}

// ── A1.5: Frequency cap check — returns ISO deferUntil or null ──
// Defers to when the OLDEST message in the rolling window ages out.
async function checkFrequencyCap(exec: any): Promise<string | null> {
  // Load tenant automation settings (defaults if no row)
  const { data: settings } = await db.from('automation_settings')
    .select('max_msgs_per_day, max_msgs_per_week')
    .eq('user_id', exec.user_id)
    .maybeSingle();

  const maxDay = settings?.max_msgs_per_day ?? 3;
  const maxWeek = settings?.max_msgs_per_week ?? 8;

  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // Count journey-originated messages to this contact in last 24h
  const { count: dayCount } = await db.from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', exec.user_id)
    .eq('wa_to', exec.contact_phone)
    .not('journey_execution_id', 'is', null)
    .gte('created_at', oneDayAgo);

  if ((dayCount ?? 0) >= maxDay) {
    // Find the OLDEST message in the 24h window so we defer until it ages out
    const { data: oldest } = await db.from('messages')
      .select('created_at')
      .eq('user_id', exec.user_id)
      .eq('wa_to', exec.contact_phone)
      .not('journey_execution_id', 'is', null)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (oldest?.created_at) {
      return new Date(new Date(oldest.created_at).getTime() + 24 * 60 * 60 * 1000 + 60000).toISOString();
    }
    return new Date(now + 60 * 60 * 1000).toISOString(); // fallback +1h
  }

  // Check 7-day cap
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: weekCount } = await db.from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', exec.user_id)
    .eq('wa_to', exec.contact_phone)
    .not('journey_execution_id', 'is', null)
    .gte('created_at', sevenDaysAgo);

  if ((weekCount ?? 0) >= maxWeek) {
    // Find the OLDEST message in the 7-day window
    const { data: oldest } = await db.from('messages')
      .select('created_at')
      .eq('user_id', exec.user_id)
      .eq('wa_to', exec.contact_phone)
      .not('journey_execution_id', 'is', null)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (oldest?.created_at) {
      return new Date(new Date(oldest.created_at).getTime() + 7 * 24 * 60 * 60 * 1000 + 60000).toISOString();
    }
    return new Date(now + 6 * 60 * 60 * 1000).toISOString(); // fallback +6h
  }

  return null;
}

// ── Apply a defer result to an execution ──
async function applyDefer(exec: any, gate: GateResult & { action: 'defer' }, stepIdx: number): Promise<void> {
  const deferMinutes = Math.max(1, Math.round((new Date(gate.deferUntil).getTime() - Date.now()) / 60000));
  await db.from('journey_executions').update({
    status: 'waiting_delay',
    current_step: stepIdx,
    wake_at: gate.deferUntil,
    total_deferred_minutes: (exec.total_deferred_minutes || 0) + deferMinutes,
  }).eq('id', exec.id);
  console.log(`[journey-engine] DEFER exec=${exec.id} step=${stepIdx} reason=${gate.reason} until=${gate.deferUntil} (+${deferMinutes}m, total=${(exec.total_deferred_minutes || 0) + deferMinutes}m)`);
}

// ── Apply an abort result to an execution ──
async function applyAbort(exec: any, gate: GateResult & { action: 'abort' }): Promise<void> {
  await db.from('journey_executions').update({
    status: gate.status,
    cancel_reason: gate.reason,
    finished_at: new Date().toISOString(),
  }).eq('id', exec.id);
  console.log(`[journey-engine] ABORT exec=${exec.id} status=${gate.status} reason=${gate.reason}`);
}

async function getWhatsAppAccount(userId: string) {
  const { data } = await db.from('whatsapp_accounts')
    .select('id, phone_number_id, display_phone_number')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  // Decrypt WABA token from Vault
  const { data: accessToken } = await db.rpc('get_waba_access_token', { p_account_id: data.id });
  return { ...data, access_token: accessToken ?? '' };
}

function matchFilters(filters: Record<string, any>, payload: Record<string, any>): boolean {
  for (const [key, filterVal] of Object.entries(filters)) {
    if (key === 'min_cart_total') {
      const cartTotal = Number(payload.cart_total ?? 0);
      if (cartTotal < Number(filterVal)) return false;
    } else if (key === 'risk_band') {
      // risk_band filter: array of allowed bands, e.g. ["medium", "high"]
      const bands = Array.isArray(filterVal) ? filterVal : [filterVal];
      if (!bands.includes(payload.risk_band)) return false;
    }
    // Add more filter matchers as needed
  }
  return true;
}

// ── HMAC-SHA256 for callbacks ──
async function hmacSign(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Tag helper (reuses flow-engine pattern) ──
async function setTag(userId: string, phone: string, tagName: string) {
  const { data: tag } = await db.from('tags')
    .upsert({ user_id: userId, name: tagName }, { onConflict: 'user_id,name' })
    .select('id').single();
  if (!tag) return;

  const { data: contact } = await db.from('contacts')
    .select('id').eq('user_id', userId).eq('phone_number', phone).maybeSingle();
  if (!contact) return;

  await db.from('contact_tags')
    .upsert({ contact_id: contact.id, tag_id: tag.id, user_id: userId }, { onConflict: 'contact_id,tag_id' });
}

// ── Enqueue a template message (worker sends it) ──
async function enqueueTemplate(
  exec: any, account: any, templateId: string,
  variableBindings: Record<string, string>, headerMedia: string | null,
  context: Record<string, any>,
): Promise<{ ok: boolean; error?: string }> {
  // Load template — templateId may be a UUID or a template name
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId);
  const query = db.from('templates')
    .select('name, language, components, body_text, header_sample_url')
    .eq('whatsapp_account_id', account.id);
  const { data: tpl } = isUuid
    ? await query.eq('id', templateId).maybeSingle()
    : await query.eq('name', templateId).eq('status', 'approved').maybeSingle();

  if (!tpl) return { ok: false, error: `Template ${templateId} not found` };

  // Resolve variable bindings → body params
  const bodyParamKeys = Object.keys(variableBindings).sort((a, b) => parseInt(a) - parseInt(b));
  const bodyParams = bodyParamKeys.map(k => resolveBinding(variableBindings[k], context));

  // Build components via shared builder
  const media = headerMedia || tpl.header_sample_url || undefined;
  const components = buildTemplateSendComponents(tpl as StoredTemplate, {
    headerMedia: media,
    bodyParams: bodyParams.length > 0 ? bodyParams : undefined,
  });

  // Resolve/create conversation
  const conversationId = await resolveConversation(
    exec.user_id, account.id, exec.contact_phone,
    `⚡ Journey: ${tpl.name}`,
  );

  // Build the full Graph payload (worker POSTs this verbatim)
  const content = {
    messaging_product: 'whatsapp',
    to: exec.contact_phone,
    type: 'template',
    template: {
      name: tpl.name,
      language: { code: tpl.language },
      components,
    },
  };

  // Insert into messages — worker claims and sends
  const { error: insertErr } = await db.from('messages').insert({
    user_id: exec.user_id,
    whatsapp_account_id: account.id,
    conversation_id: conversationId,
    journey_execution_id: exec.id,
    direction: 'outbound',
    wa_from: account.display_phone_number?.replace(/[^0-9]/g, '') ?? account.phone_number_id,
    wa_to: exec.contact_phone,
    message_type: 'template',
    template_name: tpl.name,
    content,
    status: 'queued',
  });

  if (insertErr) {
    console.error('[journey-engine] message insert error:', insertErr.message);
    return { ok: false, error: insertErr.message };
  }

  // Update conversation preview
  await db.from('conversations').update({
    last_message_preview: `⚡ ${tpl.name}`,
    last_message_at: new Date().toISOString(),
    last_message_direction: 'outbound',
  }).eq('id', conversationId);

  return { ok: true };
}

// ── Execute steps ──
async function runSteps(
  exec: any, steps: any[], startIdx: number, account: any,
  integrationKey: any,
  journey?: any,  // passed for gate checks
): Promise<void> {
  let stepIdx = startIdx;

  while (stepIdx < steps.length && stepIdx < MAX_STEPS) {
    const step = steps[stepIdx];
    if (!step) { await finish(exec, 'completed'); return; }

    // ── A1.7: Unified pre-send gate — runs before every send step ──
    if ((step.type === 'send_template' || step.type === 'send_buttons') && journey) {
      const gate = await evaluateSendGate(exec, journey);
      if (gate.action === 'abort') {
        await applyAbort(exec, gate);
        return;
      }
      if (gate.action === 'defer') {
        await applyDefer(exec, gate, stepIdx);
        return; // cron will re-run the full gate when wake_at fires
      }
      // gate.action === 'send' → continue
    } else if ((step.type === 'send_template' || step.type === 'send_buttons') && !journey) {
      // Fallback for branch executions without journey context: just check blacklist
      if (await isBlacklisted(exec.user_id, exec.contact_phone)) {
        console.log(`[journey-engine] exec=${exec.id} step=${stepIdx} skipped: blacklisted`);
        await finish(exec, 'completed');
        return;
      }
    }

    if (step.type === 'wait') {
      const minutes = step.minutes ?? 1;
      const wakeAt = new Date(Date.now() + minutes * 60_000).toISOString();
      await db.from('journey_executions').update({
        status: 'waiting_delay',
        current_step: stepIdx,
        wake_at: wakeAt,
      }).eq('id', exec.id);
      return; // cron will resume

    } else if (step.type === 'send_template') {
      if (!step.template_id) {
        await finish(exec, 'error', `Step ${stepIdx}: no template_id`);
        return;
      }
      const result = await enqueueTemplate(
        exec, account, step.template_id,
        step.variable_bindings || {}, step.header_media ?? null,
        exec.context,
      );
      if (!result.ok) {
        await finish(exec, 'error', `Step ${stepIdx}: ${result.error}`);
        return;
      }
      stepIdx++;

    } else if (step.type === 'send_buttons') {
      // Buttons = template with quick-reply buttons. Enqueue the same way.
      if (!step.template_id) {
        await finish(exec, 'error', `Step ${stepIdx}: no template_id for buttons`);
        return;
      }
      const result = await enqueueTemplate(
        exec, account, step.template_id,
        step.variable_bindings || {}, step.header_media ?? null,
        exec.context,
      );
      if (!result.ok) {
        await finish(exec, 'error', `Step ${stepIdx}: ${result.error}`);
        return;
      }
      // Wait for reply — extend timeout if message was delayed by quiet hours
      let timeoutHours = step.reply_timeout_hours ?? 0;
      if (timeoutHours > 0 && exec.context?._quiet_hours_delayed) {
        // Add quiet hours duration to the reply window so the customer
        // gets the full timeout after they actually receive the message
        timeoutHours += 10; // conservative: max quiet period is ~10h (22:00-08:00)
      }
      const timeoutAt = timeoutHours > 0
        ? new Date(Date.now() + timeoutHours * 3600_000).toISOString()
        : null;
      await db.from('journey_executions').update({
        status: 'waiting_reply',
        current_step: stepIdx,
        wake_at: timeoutAt, // re-use wake_at for reply timeout
        context: {
          ...exec.context,
          _awaiting_buttons: {
            on_reply: step.on_reply || {},
            on_timeout: step.on_timeout || [],
          },
        },
      }).eq('id', exec.id);
      return;

    } else if (step.type === 'condition') {
      const fieldVal = resolveBinding(step.field || '', exec.context);
      let matched = false;
      const cmpVal = String(step.value ?? '');
      switch (step.op) {
        case '>=': matched = Number(fieldVal) >= Number(cmpVal); break;
        case '<=': matched = Number(fieldVal) <= Number(cmpVal); break;
        case '==': matched = fieldVal === cmpVal; break;
        case '!=': matched = fieldVal !== cmpVal; break;
        case 'contains': matched = fieldVal.toLowerCase().includes(cmpVal.toLowerCase()); break;
        default: matched = fieldVal === cmpVal;
      }
      const branch = matched ? (step.then || []) : (step.else || []);
      if (branch.length > 0) {
        // Execute the branch inline (recursive sub-steps)
        await runSteps(exec, branch, 0, account, integrationKey, journey);
      }
      stepIdx++;

    } else if (step.type === 'set_tag') {
      await setTag(exec.user_id, exec.contact_phone, step.tag || 'unknown');
      stepIdx++;

    } else if (step.type === 'callback') {
      // Build unified callback payload with external_ref
      const ctx = exec.context?.payload ?? {};
      const callbackId = crypto.randomUUID();
      const callbackPayload = {
        callback_id: callbackId,
        type: 'action' as const,
        action: step.action ?? step.decision, // prefer 'action', fallback 'decision' for compat
        external_ref: {
          type: ctx.external_type ?? 'order',
          id: ctx.order_uuid ?? ctx.order_id ?? null,
          store_ref: ctx.store_ref ?? ctx.external_store_ref ?? null,
        },
        source: 'whatsapp_button',
        phone: exec.contact_phone,
        event_id: exec.event_id,
        order_uuid: ctx.order_uuid ?? ctx.order_id ?? null,
        order_number: ctx.order_number ?? null,
        occurred_at: new Date().toISOString(),
      };

      if (integrationKey?.callback_url && integrationKey?.callback_secret) {
        // Dispatch with retry (logged to callback_log)
        await dispatchCallback(
          db, exec.user_id,
          integrationKey.callback_url, integrationKey.callback_secret,
          callbackPayload,
        );
      }

      // OrderGuard: update order confirm_status based on action
      const cbOrderId = ctx.order_uuid ?? ctx.order_id;
      if (cbOrderId) {
        try {
          const cbSource = ctx.source ?? 'api';
          const actionVal = step.action ?? step.decision;
          if (actionVal === 'order.confirm' || actionVal === 'confirmed') {
            await updateOrderConfirmStatus(db, exec.user_id, cbSource, String(cbOrderId), 'confirmed');
          } else if (actionVal === 'order.cancel' || actionVal === 'cancelled') {
            await updateOrderConfirmStatus(db, exec.user_id, cbSource, String(cbOrderId), 'declined');
          }
        } catch (e: any) {
          console.error('[journey-engine] order confirm update error:', e.message);
        }
      }
      stepIdx++;

    } else if (step.type === 'send_payment_link') {
      // Create a payment link and optionally send a template with pay_url
      const amountSource = step.amount_source ?? 'order_total';
      let linkAmount = 0;
      if (amountSource === 'fixed' && step.fixed_amount) {
        linkAmount = Number(step.fixed_amount);
      } else {
        linkAmount = Number(exec.context?.payload?.total ?? 0);
      }
      const discountPct = step.discount_pct ?? 0;
      const discountAmt = discountPct > 0 ? Math.round(linkAmount * discountPct / 100) : 0;

      // Find the order for this execution (if any)
      let orderId: string | undefined;
      const extOrderId = exec.context?.payload?.order_id;
      if (extOrderId) {
        const { data: ord } = await db.from('orders')
          .select('id').eq('user_id', exec.user_id)
          .eq('external_order_id', String(extOrderId))
          .limit(1).maybeSingle();
        if (ord) orderId = ord.id;
      }

      try {
        const linkResult = await createPaymentLink(db, exec.user_id, {
          orderId,
          orderExternalId: extOrderId ? String(extOrderId) : undefined,
          contactPhone: exec.contact_phone,
          amount: linkAmount,
          discount: discountAmt,
          source: 'journey',
          journeyExecutionId: exec.id,
        });

        if (linkResult.ok && linkResult.payUrl) {
          // Inject pay_url into execution context for subsequent steps
          const ctx = exec.context ?? {};
          ctx.pay_url = linkResult.payUrl;
          ctx.payment_link_id = linkResult.paymentLinkId;
          ctx.discounted_total = linkResult.amount;
          await db.from('journey_executions').update({
            context: ctx,
          }).eq('id', exec.id);
          exec.context = ctx;

          // If a then_template_id is configured, send that template with pay_url
          if (step.then_template_id && account) {
            const bindings = step.variable_bindings ?? {
              '1': 'contact.name',
              '2': 'payload.order_id',
              '3': 'payload.total',
              '4': 'pay_url',
            };
            const result = await enqueueTemplate(
              exec, account, step.then_template_id,
              bindings, null, exec.context,
            );
            if (!result.ok) {
              console.warn(`[journey-engine] send_payment_link template failed: ${result.error}`);
            }
          }
        } else {
          console.log(`[journey-engine] send_payment_link: failed (${linkResult.error}), skipping`);
        }
      } catch (err: any) {
        console.error(`[journey-engine] send_payment_link error: ${err.message}`);
      }
      stepIdx++;


    } else if (step.type === 'end') {
      await finish(exec, 'completed');
      return;

    } else {
      console.warn(`[journey-engine] Unknown step type: ${step.type}`);
      stepIdx++;
    }

    // Persist cursor
    await db.from('journey_executions').update({
      current_step: stepIdx,
    }).eq('id', exec.id);
  }

  // Fell off end of steps
  await finish(exec, 'completed');
}

async function finish(exec: any, status: string, error?: string) {
  await db.from('journey_executions').update({
    status,
    error_message: error ?? null,
    finished_at: new Date().toISOString(),
  }).eq('id', exec.id);
}

// ─── Main Handler ───
Deno.serve(async (req: Request) => {
  // Security: service-role only
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${SERVICE_ROLE}`) {
    return new Response('unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();

    // ── ACTION: wake (cron) ──
    if (body.action === 'wake') {
      const { data: dueExecs } = await db.from('journey_executions')
        .select('*')
        .eq('status', 'waiting_delay')
        .lte('wake_at', new Date().toISOString())
        .limit(50);

      if (!dueExecs || dueExecs.length === 0) {
        return new Response(JSON.stringify({ woken: 0 }), { status: 200 });
      }

      let woken = 0;
      for (const exec of dueExecs) {
        try {
          // Load journey steps
          const { data: journey } = await db.from('journeys')
            .select('steps, is_active, user_id, preset, trigger_event, respects_quiet_hours')
            .eq('id', exec.journey_id).single();
          if (!journey || !journey.is_active) {
            await finish(exec, 'cancelled', 'Journey deactivated');
            continue;
          }

          const account = await getWhatsAppAccount(exec.user_id);
          if (!account) {
            await finish(exec, 'error', 'No active WhatsApp account');
            continue;
          }

          // Load integration key for callback info
          const { data: intKey } = await db.from('integration_keys')
            .select('callback_url, callback_secret')
            .eq('user_id', exec.user_id)
            .eq('is_active', true)
            .limit(1).maybeSingle();

          // Advance past the wait step
          const nextStep = exec.current_step + 1;
          await db.from('journey_executions').update({
            status: 'active',
            current_step: nextStep,
            wake_at: null,
          }).eq('id', exec.id);
          exec.current_step = nextStep;

          await runSteps(exec, journey.steps, nextStep, account, intKey, journey);
          woken++;
        } catch (e: any) {
          await finish(exec, 'error', e.message);
        }
      }

      // Also check for reply timeouts
      const { data: timedOut } = await db.from('journey_executions')
        .select('*')
        .eq('status', 'waiting_reply')
        .not('wake_at', 'is', null)
        .lte('wake_at', new Date().toISOString())
        .limit(20);

      for (const exec of timedOut ?? []) {
        try {
          const { data: journey } = await db.from('journeys')
            .select('steps, preset, trigger_event, respects_quiet_hours').eq('id', exec.journey_id).single();
          if (!journey) continue;

          const step = journey.steps[exec.current_step];
          const onTimeout = exec.context?._awaiting_buttons?.on_timeout || step?.on_timeout || [];

          const account = await getWhatsAppAccount(exec.user_id);
          if (!account) { await finish(exec, 'error', 'No WhatsApp account'); continue; }

          const { data: intKey } = await db.from('integration_keys')
            .select('callback_url, callback_secret')
            .eq('user_id', exec.user_id).eq('is_active', true).limit(1).maybeSingle();

          // OrderGuard: on timeout, mark order as no_response
          const toOrderId = exec.context?.payload?.order_id;
          if (toOrderId) {
            try {
              const toSource = exec.context?.payload?.source ?? 'api';
              await updateOrderConfirmStatus(db, exec.user_id, toSource, String(toOrderId), 'no_response');
            } catch (e: any) {
              console.error('[journey-engine] timeout order update error:', e.message);
            }
          }

          if (onTimeout.length > 0) {
            await db.from('journey_executions').update({
              status: 'active', wake_at: null,
            }).eq('id', exec.id);
            await runSteps(exec, onTimeout, 0, account, intKey, journey);
          } else {
            await finish(exec, 'completed');
          }
        } catch (e: any) {
          await finish(exec, 'error', e.message);
        }
      }

      return new Response(JSON.stringify({ woken }), { status: 200 });
    }

    // ── ACTION: inbound_reply (webhook button tap) ──
    if (body.action === 'inbound_reply') {
      const { phone, button_payload, user_id } = body;
      if (!phone || !button_payload) {
        return new Response(JSON.stringify({ error: 'phone and button_payload required' }), { status: 400 });
      }

      // Find active waiting_reply execution for this phone
      const { data: exec } = await db.from('journey_executions')
        .select('*')
        .eq('contact_phone', phone)
        .eq('user_id', user_id)
        .eq('status', 'waiting_reply')
        .limit(1)
        .maybeSingle();

      if (!exec) {
        return new Response(JSON.stringify({ matched: false }), { status: 200 });
      }

      // Load journey and step
      const { data: journey } = await db.from('journeys')
        .select('steps, preset, trigger_event, respects_quiet_hours').eq('id', exec.journey_id).single();
      if (!journey) {
        await finish(exec, 'error', 'Journey not found');
        return new Response(JSON.stringify({ error: 'journey not found' }), { status: 200 });
      }

      const awaitingConfig = exec.context?._awaiting_buttons;
      const onReply = awaitingConfig?.on_reply || {};

      // Match button payload to on_reply branches
      // Normalize: strip emoji/non-alpha, collapse whitespace, uppercase
      // e.g. "✅ Confirm" → "CONFIRM", "❌ Cancel" → "CANCEL"
      // Also handles literal "uXXXX" escapes from WhatsApp (e.g. "u274c Cancel")
      const normalPayload = button_payload
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
        .replace(/\bu[0-9a-fA-F]{4,5}\b/g, '')  // strip "u274c", "u2705" etc.
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();
      const branchSteps = onReply[normalPayload] || onReply[button_payload.toUpperCase().trim()] || onReply[button_payload] || null;

      if (!branchSteps || branchSteps.length === 0) {
        // No matching branch — continue to next step
        const nextStep = exec.current_step + 1;
        await db.from('journey_executions').update({
          status: 'active',
          current_step: nextStep,
          wake_at: null,
          context: { ...exec.context, _awaiting_buttons: undefined, _last_reply: button_payload },
        }).eq('id', exec.id);
        exec.current_step = nextStep;

        const account = await getWhatsAppAccount(exec.user_id);
        if (!account) { await finish(exec, 'error', 'No WhatsApp account'); return new Response('ok'); }

        const { data: intKey } = await db.from('integration_keys')
          .select('callback_url, callback_secret')
          .eq('user_id', exec.user_id).eq('is_active', true).limit(1).maybeSingle();

        await runSteps(exec, journey.steps, nextStep, account, intKey, journey);
      } else {
        // Execute matched branch
        await db.from('journey_executions').update({
          status: 'active',
          wake_at: null,
          context: { ...exec.context, _awaiting_buttons: undefined, _last_reply: button_payload },
        }).eq('id', exec.id);

        const account = await getWhatsAppAccount(exec.user_id);
        if (!account) { await finish(exec, 'error', 'No WhatsApp account'); return new Response('ok'); }

        const { data: intKey } = await db.from('integration_keys')
          .select('callback_url, callback_secret')
          .eq('user_id', exec.user_id).eq('is_active', true).limit(1).maybeSingle();

        await runSteps(exec, branchSteps, 0, account, intKey, journey);
      }

      return new Response(JSON.stringify({ matched: true, execution_id: exec.id }), { status: 200 });
    }

    // ── ACTION: event_id (new event) ──
    const eventId = body.event_id;
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'event_id or action required' }), { status: 400 });
    }

    // Load event
    const { data: event } = await db.from('events')
      .select('*').eq('id', eventId).single();
    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404 });
    }

    const userId = event.user_id;
    const phone = event.contact_phone;

    // ── EXIT PASS: cancel active executions whose journey exits on this event ──
    let exitedCount = 0;
    if (phone) {
      const { data: activeExecs } = await db.from('journey_executions')
        .select('id, journey_id')
        .eq('user_id', userId)
        .eq('contact_phone', phone)
        .in('status', ['active', 'waiting_delay', 'waiting_reply']);

      for (const exec of activeExecs ?? []) {
        const { data: journey } = await db.from('journeys')
          .select('exit_on_events').eq('id', exec.journey_id).single();
        if (journey && (journey.exit_on_events ?? []).includes(event.event_type)) {
          await db.from('journey_executions').update({
            status: 'exited_goal',
            finished_at: new Date().toISOString(),
          }).eq('id', exec.id);
          exitedCount++;
        }
      }
    }

    // ── START PASS: find matching journeys ──
    let startedCount = 0;
    if (phone && !await isBlacklisted(userId, phone)) {
      const { data: journeys } = await db.from('journeys')
        .select('*')
        .eq('user_id', userId)
        .eq('trigger_event', event.event_type)
        .eq('is_active', true);

      const account = await getWhatsAppAccount(userId);
      if (!account) {
        await db.from('events').update({ status: 'error', error_message: 'No active WhatsApp account' })
          .eq('id', eventId);
        return new Response(JSON.stringify({ error: 'No WhatsApp account' }), { status: 200 });
      }

      for (const journey of journeys ?? []) {
        // Check trigger filters
        if (!matchFilters(journey.trigger_filters ?? {}, event.payload ?? {})) continue;

        // Create execution (unique index dedupes)
        const context = {
          contact: { name: event.contact_name, phone_number: phone },
          payload: event.payload,
          event_type: event.event_type,
        };

        const { data: exec, error: execErr } = await db.from('journey_executions')
          .insert({
            journey_id: journey.id,
            user_id: userId,
            contact_phone: phone,
            event_id: eventId,
            current_step: 0,
            status: 'active',
            context,
          })
          .select()
          .single();

        if (execErr) {
          if (execErr.code === '23505') {
            // Already running for this journey+contact — skip
            continue;
          }
          console.error(`[journey-engine] exec create error: ${execErr.message}`);
          continue;
        }

        // Load integration key for callbacks
        const { data: intKey } = await db.from('integration_keys')
          .select('callback_url, callback_secret')
          .eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle();

        // Run steps
        try {
          await runSteps(exec, journey.steps, 0, account, intKey, journey);
          startedCount++;
        } catch (e: any) {
          await finish(exec, 'error', e.message);
        }
      }
    } else if (phone) {
      // Blacklisted — mark event as ignored
      await db.from('events').update({ status: 'ignored', error_message: 'Contact blacklisted' })
        .eq('id', eventId);
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: 'blacklisted' }), { status: 200 });
    }

    // Mark event as processed
    await db.from('events').update({ status: 'processed' }).eq('id', eventId);

    console.log(`[journey-engine] event=${eventId} exited=${exitedCount} started=${startedCount}`);
    return new Response(JSON.stringify({ ok: true, exited: exitedCount, started: startedCount }), { status: 200 });

  } catch (err: any) {
    console.error('[journey-engine] Unhandled error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
