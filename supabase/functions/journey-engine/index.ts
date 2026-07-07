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
    if (val === null || val === undefined) return '';
    val = val[part];
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

async function getWhatsAppAccount(userId: string) {
  const { data } = await db.from('whatsapp_accounts')
    .select('id, phone_number_id, access_token, display_phone_number')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return data;
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
  // Load template
  const { data: tpl } = await db.from('templates')
    .select('name, language, components, body_text, header_sample_url')
    .eq('id', templateId)
    .maybeSingle();

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
): Promise<void> {
  let stepIdx = startIdx;

  while (stepIdx < steps.length && stepIdx < MAX_STEPS) {
    const step = steps[stepIdx];
    if (!step) { await finish(exec, 'completed'); return; }

    // Check blacklist at every send step
    if ((step.type === 'send_template' || step.type === 'send_buttons') &&
        await isBlacklisted(exec.user_id, exec.contact_phone)) {
      console.log(`[journey-engine] exec=${exec.id} step=${stepIdx} skipped: blacklisted`);
      await finish(exec, 'completed');
      return;
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
      // Wait for reply
      const timeoutAt = step.reply_timeout_hours
        ? new Date(Date.now() + step.reply_timeout_hours * 3600_000).toISOString()
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
        await runSteps(exec, branch, 0, account, integrationKey);
      }
      stepIdx++;

    } else if (step.type === 'set_tag') {
      await setTag(exec.user_id, exec.contact_phone, step.tag || 'unknown');
      stepIdx++;

    } else if (step.type === 'callback') {
      if (integrationKey?.callback_url && integrationKey?.callback_secret) {
        const callbackBody = JSON.stringify({
          decision: step.decision,
          phone: exec.contact_phone,
          event_id: exec.event_id,
          order_id: exec.context?.payload?.order_id ?? null,
          timestamp: new Date().toISOString(),
        });
        const signature = await hmacSign(integrationKey.callback_secret, callbackBody);
        fetch(integrationKey.callback_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ReachPeak-Signature': signature,
          },
          body: callbackBody,
        }).catch(err => {
          console.error(`[journey-engine] callback error: ${err.message}`);
        });
      }

      // OrderGuard: update order confirm_status based on callback decision
      const cbOrderId = exec.context?.payload?.order_id;
      if (cbOrderId) {
        try {
          const cbSource = exec.context?.payload?.source ?? 'api';
          if (step.decision === 'confirmed') {
            await updateOrderConfirmStatus(db, exec.user_id, cbSource, String(cbOrderId), 'confirmed');
          } else if (step.decision === 'cancelled') {
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
            .select('steps, is_active, user_id')
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

          await runSteps(exec, journey.steps, nextStep, account, intKey);
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
            .select('steps').eq('id', exec.journey_id).single();
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
            await runSteps(exec, onTimeout, 0, account, intKey);
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
        .select('steps').eq('id', exec.journey_id).single();
      if (!journey) {
        await finish(exec, 'error', 'Journey not found');
        return new Response(JSON.stringify({ error: 'journey not found' }), { status: 200 });
      }

      const awaitingConfig = exec.context?._awaiting_buttons;
      const onReply = awaitingConfig?.on_reply || {};

      // Match button payload to on_reply branches
      const normalPayload = button_payload.toUpperCase().trim();
      const branchSteps = onReply[normalPayload] || onReply[button_payload] || null;

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

        await runSteps(exec, journey.steps, nextStep, account, intKey);
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

        await runSteps(exec, branchSteps, 0, account, intKey);
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
          await runSteps(exec, journey.steps, 0, account, intKey);
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
