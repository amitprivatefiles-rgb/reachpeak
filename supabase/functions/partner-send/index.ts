// Supabase Edge Function: partner-send
// API-key authenticated WhatsApp send endpoint for partner integrations.
// Enqueues messages for the worker to send (reuses existing pipeline).
//
// Auth:   API key in Authorization header (Bearer rpk_live_...)
// Deploy: supabase functions deploy partner-send --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { normalizePhone } from '../_shared/eventPipeline.ts';
import { buildTemplateSendComponents, missingRequiredHeaderMedia } from '../_shared/templatePayload.ts';
import { classifyError } from '../_shared/errorClassifier.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// SHA-256 hash
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// In-memory rate limiter (same as ingest-event)
const rateCounts = new Map<string, { count: number; resetAt: number }>();
function checkRate(keyHash: string): boolean {
  const now = Date.now();
  let entry = rateCounts.get(keyHash);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 };
    rateCounts.set(keyHash, entry);
  }
  entry.count++;
  return entry.count <= 600;
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Wallet billing helpers ──
// Map a WhatsApp/template category to one of our four priced buckets.
function normalizeCategory(c: string | null | undefined): string {
  const v = (c || '').toString().toLowerCase();
  if (v === 'marketing' || v === 'utility' || v === 'authentication' || v === 'service') return v;
  return 'utility'; // unknown → charge as utility (never silently free)
}
async function priceForCategory(cat: string): Promise<number> {
  const { data } = await db.from('message_pricing').select('price_paise').eq('category', cat).maybeSingle();
  return data ? Number(data.price_paise) : 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    /* ── 1. Authenticate via API key ── */
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'API key required', code: 'invalid_api_key' }, 401);

    const keyHash = await sha256(token);

    const { data: integration, error: keyErr } = await db
      .from('integration_keys')
      .select('id, user_id, source, is_active')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .maybeSingle();

    if (keyErr || !integration)
      return json({ error: 'Invalid or inactive API key', code: 'invalid_api_key' }, 401);

    if (!checkRate(keyHash))
      return json({ error: 'Rate limit exceeded (600/min)', code: 'rate_limited' }, 429);

    // Update last_used_at (fire-and-forget)
    db.from('integration_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', integration.id)
      .then(() => {});

    const userId = integration.user_id;

    /* ── 2. Parse and validate body ── */
    const body = await req.json();
    const {
      to,
      type = 'template',
      template,
      text,
      media_url,
      caption,
      filename,
      idempotency_key,
      external_ref,
      contact,
      dry_run = false,
    } = body;

    if (!to) return json({ error: 'Missing "to" phone number' }, 400);
    if (!idempotency_key) return json({ error: 'idempotency_key is required' }, 400);

    const phone = normalizePhone(to);
    if (!phone) return json({ error: 'Invalid phone number' }, 400);

    /* ── 3. Idempotency check ── */
    const { data: existing } = await db
      .from('messages')
      .select('id')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle();

    if (existing) {
      return json({
        queued: false,
        message_id: existing.id,
        idempotency_key,
        code: 'idempotency_hit',
      }, 409);
    }

    /* ── 4. Load WABA account ── */
    const { data: account } = await db
      .from('whatsapp_accounts')
      .select('id, phone_number_id, display_phone_number, marketing_paused')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!account) {
      return json({ error: 'No active WhatsApp account connected', code: 'no_whatsapp_account' }, 422);
    }

    /* ── 5. Upsert contact ── */
    if (phone) {
      const { data: existingContact } = await db.from('contacts')
        .select('id, is_blacklisted, blacklist_reason')
        .eq('user_id', userId)
        .eq('phone_number', phone)
        .maybeSingle();

      if (existingContact) {
        // Blacklist check
        if (existingContact.is_blacklisted) {
          const reason = existingContact.blacklist_reason === 'hard_bounce'
            ? 'Contact suppressed due to hard bounces (not on WhatsApp)'
            : 'Contact has opted out';
          return json({ error: reason, code: 'opted_out' }, 422);
        }
        // Update name if provided and not set
        if (contact?.name) {
          await db.from('contacts')
            .update({ name: contact.name, updated_at: new Date().toISOString() })
            .eq('id', existingContact.id)
            .is('name', null);
        }
      } else {
        // Create new contact
        const { error: insertErr } = await db.from('contacts').insert({
          user_id: userId,
          phone_number: phone,
          name: contact?.name ?? null,
          source: integration.source,
          lead_type: 'Warm',
        });
        if (insertErr && insertErr.code !== '23505') {
          console.error('[partner-send] Contact insert error:', insertErr.message);
        }
      }
    }

    /* ── 6. Service window check (text type only) ── */
    if (type === 'text') {
      const { data: convo } = await db.from('conversations')
        .select('window_expires_at')
        .eq('user_id', userId)
        .eq('contact_phone', phone)
        .maybeSingle();

      const windowOpen = convo?.window_expires_at &&
        new Date(convo.window_expires_at) > new Date();

      if (!windowOpen) {
        return json({
          error: 'No open 24-hour service window for this contact. Use type="template" instead.',
          code: 'no_service_window',
        }, 422);
      }
    }

    /* ── 7. Build payload ── */
    let payload: Record<string, unknown>;
    let messageType = type;
    let templateName: string | null = null;
    let chargeCategory = 'service'; // text/media session messages default to 'service'

    switch (type) {
      case 'text':
        if (!text) return json({ error: 'Missing "text" for a text message' }, 400);
        payload = { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } };
        break;

      case 'image':
        if (!media_url) return json({ error: 'Missing "media_url" for image' }, 400);
        payload = {
          messaging_product: 'whatsapp', to: phone, type: 'image',
          image: { link: media_url, ...(caption ? { caption } : {}) },
        };
        break;

      case 'document':
        if (!media_url) return json({ error: 'Missing "media_url" for document' }, 400);
        payload = {
          messaging_product: 'whatsapp', to: phone, type: 'document',
          document: { link: media_url, ...(caption ? { caption } : {}), ...(filename ? { filename } : {}) },
        };
        break;

      case 'template':
      default: {
        if (!template?.name) return json({ error: 'Missing template.name' }, 400);
        messageType = 'template';
        templateName = template.name;

        // Check marketing pause
        if (account.marketing_paused) {
          const { data: tpl } = await db.from('templates')
            .select('category')
            .eq('whatsapp_account_id', account.id)
            .eq('name', template.name)
            .maybeSingle();
          if (tpl?.category === 'marketing') {
            return json({
              error: 'Marketing sends are paused for this WhatsApp number due to quality issues. Utility/transactional templates can still be sent.',
              code: 'marketing_paused',
            }, 422);
          }
        }

        // Load stored template
        const { data: storedTpl } = await db
          .from('templates')
          .select('name, language, components, body_text, header_sample_url, status, category')
          .eq('whatsapp_account_id', account.id)
          .eq('name', template.name)
          .limit(1)
          .maybeSingle();

        if (!storedTpl) {
          return json({ error: `Template "${template.name}" not found`, code: 'template_not_found' }, 422);
        }
        if (storedTpl.status !== 'approved') {
          return json({
            error: `Template "${template.name}" is not approved (status: ${storedTpl.status})`,
            code: storedTpl.status === 'paused' ? 'template_paused' : 'template_rejected',
          }, 422);
        }
        chargeCategory = normalizeCategory(storedTpl.category);

        const inputs = {
          headerMedia: template.headerMedia,
          headerTextParams: template.headerTextParams,
          bodyParams: template.bodyParams ?? [],
          buttonParams: template.buttonParams ?? [],
        };

        if (missingRequiredHeaderMedia(storedTpl, inputs)) {
          return json({ error: 'Template requires header media but none provided' }, 400);
        }

        const sendComponents = buildTemplateSendComponents(storedTpl, inputs);

        payload = {
          messaging_product: 'whatsapp', to: phone, type: 'template',
          template: {
            name: template.name,
            language: { code: template.language || storedTpl.language || 'en_US' },
            ...(sendComponents.length > 0 ? { components: sendComponents } : {}),
          },
        };
        break;
      }
    }

    /* ── 8. Resolve contact_id ── */
    const { data: contactRow } = await db.from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('phone_number', phone)
      .maybeSingle();

    /* ── 8b. Ensure a conversation exists so outbound sends appear in the Inbox ── */
    let conversationId: string | null = null;
    if (!dry_run) {
      const preview = messageType === 'template' ? `📋 ${templateName ?? 'Template'}` : (text ?? '').slice(0, 120);
      const nowIso = new Date().toISOString();
      const { data: existingConvo } = await db.from('conversations')
        .select('id').eq('user_id', userId).eq('contact_phone', phone).maybeSingle();
      if (existingConvo?.id) {
        conversationId = existingConvo.id;
        await db.from('conversations').update({
          last_message_at: nowIso, last_message_preview: preview,
          last_message_direction: 'outbound', updated_at: nowIso,
        }).eq('id', existingConvo.id);
      } else {
        const { data: newConvo } = await db.from('conversations').insert({
          user_id: userId, whatsapp_account_id: account.id, contact_phone: phone,
          last_message_at: nowIso, last_message_preview: preview, last_message_direction: 'outbound',
        }).select('id').single();
        conversationId = newConvo?.id ?? null;
      }
    }

    /* ── 9. Insert message. Wallet billing: insert as 'pending_charge' first, then HOLD funds,
           then flip to 'queued' only if paid. The worker only claims 'queued', so an unpaid
           message is never sent. dry_run is never charged. ── */
    const messageRow = {
      user_id: userId,
      whatsapp_account_id: account.id,
      contact_id: contactRow?.id ?? null,
      conversation_id: conversationId,
      direction: 'outbound',
      wa_from: account.display_phone_number?.replace(/[^0-9]/g, '') || null,
      wa_to: phone,
      message_type: messageType,
      template_name: templateName,
      content: messageType === 'text' ? { text: (payload as any).text } : { template: (payload as any).template },
      status: dry_run ? 'cancelled' : 'pending_charge',
      is_dry_run: dry_run,
      idempotency_key,
      charge_category: dry_run ? null : chargeCategory,
      external_type: external_ref?.type ?? null,
      external_id: external_ref?.id ?? null,
      external_store_ref: external_ref?.store_ref ?? null,
    };

    const { data: inserted, error: insErr } = await db
      .from('messages')
      .insert(messageRow)
      .select('id')
      .single();

    if (insErr) {
      // Unique constraint on idempotency_key (race condition)
      if (insErr.code === '23505' && insErr.message?.includes('idempotency')) {
        const { data: raceHit } = await db.from('messages')
          .select('id').eq('idempotency_key', idempotency_key).maybeSingle();
        return json({
          queued: false, message_id: raceHit?.id, idempotency_key, code: 'idempotency_hit',
        }, 409);
      }
      return json({ error: 'Failed to enqueue message: ' + insErr.message }, 500);
    }

    const messageId = inserted!.id;

    if (dry_run) {
      return json({
        queued: false,
        dry_run: true,
        message_id: messageId,
        idempotency_key,
        validation: 'passed',
      });
    }

    /* ── 9b. Charge the wallet: HOLD the per-category price (idempotent on 'msg:<id>'). ── */
    const price = await priceForCategory(chargeCategory);

    if (price <= 0) {
      // Free category (e.g. service, or admin set price to 0) — no hold needed.
      await db.from('messages').update({ status: 'queued', charge_paise: 0 }).eq('id', messageId);
    } else {
      const holdRef = 'msg:' + messageId;
      const { error: holdErr } = await db.rpc('wallet_hold', {
        p_user: userId, p_amount: price, p_reference: holdRef,
        p_meta: { category: chargeCategory, message_id: messageId, to: phone },
      });

      if (holdErr) {
        if ((holdErr.message || '').includes('insufficient_balance')) {
          await db.from('messages').update({ status: 'blocked_insufficient_balance', charge_paise: price }).eq('id', messageId);
          return json({
            queued: false,
            blocked: true,
            code: 'insufficient_balance',
            error: 'Insufficient wallet balance. Recharge to continue sending.',
            message_id: messageId,
            required_paise: price,
            category: chargeCategory,
          }, 402);
        }
        // Unexpected hold failure — do not send. Mark failed so it is not stuck as pending_charge.
        console.error('[partner-send] wallet_hold error:', holdErr.message);
        await db.from('messages').update({
          status: 'failed', error_code: 'WALLET_HOLD_FAILED', error_message: holdErr.message,
          failed_at: new Date().toISOString(),
        }).eq('id', messageId);
        return json({ error: 'Billing hold failed: ' + holdErr.message, code: 'billing_error' }, 500);
      }

      // Paid & reserved → release to the worker.
      await db.from('messages').update({ status: 'queued', charge_paise: price }).eq('id', messageId);
    }

    console.log(`[partner-send] Enqueued ${messageId} to=${phone} type=${messageType} cat=${chargeCategory} price=${price} key=${idempotency_key}`);
    return json({
      queued: true,
      message_id: messageId,
      idempotency_key,
      charged_paise: price,
      category: chargeCategory,
    }, 201);

  } catch (err: any) {
    console.error('[partner-send] Unhandled error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
