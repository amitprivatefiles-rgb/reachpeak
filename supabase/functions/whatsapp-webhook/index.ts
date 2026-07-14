// Supabase Edge Function: whatsapp-webhook
// Receives WhatsApp Cloud API webhooks — delivery/read/failed statuses,
// inbound messages, and template approval updates.
// Also manages conversations table and downloads inbound media.
//
// Deploy PUBLIC (Meta calls it with NO Supabase JWT):
//   supabase functions deploy whatsapp-webhook --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { classifyError, HARD_BOUNCE_BUCKETS } from '../_shared/errorClassifier.ts';

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || '';
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET') || '';
const GRAPH_API_VERSION = Deno.env.get('GRAPH_API_VERSION') || 'v25.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!APP_SECRET) return true;
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = 'sha256=' +
    [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function tsToIso(ts?: string): string {
  const n = ts ? parseInt(ts, 10) : NaN;
  return Number.isFinite(n) ? new Date(n * 1000).toISOString() : new Date().toISOString();
}

// Download media from WhatsApp Graph API and store in Supabase Storage
async function downloadAndStoreMedia(
  mediaId: string,
  accessToken: string,
  userId: string,
  mimeType: string,
): Promise<string | null> {
  try {
    // 1. Get media URL from Graph API
    const metaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!metaRes.ok) {
      console.error('Failed to get media URL:', await metaRes.text());
      return null;
    }
    const metaData = await metaRes.json();
    const mediaUrl = metaData.url;
    if (!mediaUrl) return null;

    // 2. Download the actual media file
    const fileRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) {
      console.error('Failed to download media:', fileRes.status);
      return null;
    }
    const fileBlob = await fileRes.blob();

    // 3. Determine file extension from mime type
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      'video/mp4': 'mp4', 'video/webm': 'webm',
      'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/aac': 'aac',
      'application/pdf': 'pdf',
    };
    const ext = extMap[mimeType] || 'bin';
    const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;

    // 4. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(fileName, fileBlob, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message);
      return null;
    }

    // 5. Return the public URL
    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (e) {
    console.error('Media download error:', (e as Error).message);
    return null;
  }
}

// Upsert conversation for an inbound message
async function upsertConversation(
  userId: string,
  accountId: string,
  contactPhone: string,
  contactName: string | null,
  messagePreview: string,
): Promise<string | null> {
  try {
    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, unread_count')
      .eq('user_id', userId)
      .eq('contact_phone', contactPhone)
      .maybeSingle();

    const now = new Date().toISOString();
    const windowExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    if (existing) {
      const { error } = await supabase
        .from('conversations')
        .update({
          last_message_at: now,
          last_message_preview: messagePreview.substring(0, 100),
          last_message_direction: 'inbound',
          unread_count: (existing.unread_count || 0) + 1,
          window_expires_at: windowExpires,
          contact_name: contactName || undefined,
          is_open: true,
        })
        .eq('id', existing.id);
      if (error) console.error('Conversation update error:', error.message);
      return existing.id;
    } else {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          whatsapp_account_id: accountId,
          contact_phone: contactPhone,
          contact_name: contactName,
          last_message_at: now,
          last_message_preview: messagePreview.substring(0, 100),
          last_message_direction: 'inbound',
          unread_count: 1,
          window_expires_at: windowExpires,
        })
        .select('id')
        .single();
      if (error) {
        console.error('Conversation insert error:', error.message);
        return null;
      }
      return newConv?.id || null;
    }
  } catch (e) {
    console.error('Conversation upsert error:', (e as Error).message);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // --- GET: verification handshake ---
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // --- POST: events ---
  if (req.method === 'POST') {
    const rawBody = await req.text();

    if (!(await verifySignature(rawBody, req.headers.get('x-hub-signature-256')))) {
      return new Response('Invalid signature', { status: 401 });
    }

    let body: any;
    try { body = JSON.parse(rawBody); } catch { return new Response('Bad JSON', { status: 400 }); }

    try {
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value ?? {};
          const phoneNumberId = value.metadata?.phone_number_id;

          // Which tenant does this number belong to?
          let account: { id: string; user_id: string; access_token?: string } | null = null;
          if (phoneNumberId) {
            const { data } = await supabase
              .from('whatsapp_accounts')
              .select('id, user_id')
              .eq('phone_number_id', phoneNumberId)
              .maybeSingle();
            account = data ?? null;
          }

          // 1) Status updates: sent / delivered / read / failed
          for (const status of value.statuses ?? []) {
            const patch: Record<string, unknown> = {
              status: status.status,
              updated_at: new Date().toISOString(),
            };
            const whenIso = tsToIso(status.timestamp);
            if (status.status === 'sent') patch.sent_at = whenIso;
            if (status.status === 'delivered') patch.delivered_at = whenIso;
            if (status.status === 'read') patch.read_at = whenIso;
            if (status.status === 'failed') {
              patch.failed_at = whenIso;
              patch.error_code = status.errors?.[0]?.code ? String(status.errors[0].code) : null;
              patch.error_message =
                status.errors?.[0]?.title || status.errors?.[0]?.message || 'Failed';
              // Classify error into actionable bucket
              patch.error_bucket = classifyError(patch.error_code as string);
            }
            if (status.pricing) {
              patch.conversation_category = status.pricing.category ?? null;
              patch.pricing_billable = status.pricing.billable ?? null;
              // Populate cost from config table (per delivered template message)
              if (status.pricing.billable && status.pricing.category) {
                const { data: costRow } = await supabase
                  .from('messaging_cost_config')
                  .select('cost_inr')
                  .eq('category', status.pricing.category.toLowerCase())
                  .maybeSingle();
                if (costRow) patch.cost = costRow.cost_inr;
              }
            }
            if (status.id) {
              await supabase.from('messages').update(patch).eq('wamid', status.id);

              // Status callback for partner-originated messages
              if (status.status === 'delivered' || status.status === 'read' || status.status === 'failed') {
                const { data: msg } = await supabase.from('messages')
                  .select('id, external_type, external_id, external_store_ref, user_id, wamid, error_code, error_bucket')
                  .eq('wamid', status.id)
                  .maybeSingle();

                if (msg?.external_id) {
                  // Dispatch status callback to partner
                  const { data: intKey } = await supabase.from('integration_keys')
                    .select('callback_url, callback_secret')
                    .eq('user_id', msg.user_id)
                    .eq('is_active', true)
                    .limit(1)
                    .maybeSingle();

                  if (intKey?.callback_url && intKey?.callback_secret) {
                    const cbBody = JSON.stringify({
                      callback_id: crypto.randomUUID(),
                      type: 'message_status',
                      status: status.status,
                      external_ref: {
                        type: msg.external_type,
                        id: msg.external_id,
                        store_ref: msg.external_store_ref,
                      },
                      message_id: msg.id,
                      wamid: msg.wamid,
                      error_code: msg.error_code,
                      error_bucket: msg.error_bucket,
                      occurred_at: whenIso,
                    });
                    const sig = await hmacSign(intKey.callback_secret, cbBody);
                    fetch(intKey.callback_url, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-ReachPeak-Signature': sig,
                        'X-ReachPeak-Timestamp': new Date().toISOString(),
                      },
                      body: cbBody,
                    }).catch(err => console.error('[webhook] status callback error:', err.message));
                  }
                }

                // Hard bounce auto-blacklist: after 3 hard bounces, suppress the contact
                if (msg && status.status === 'failed' && HARD_BOUNCE_BUCKETS.has(patch.error_bucket as string)) {
                  const { count } = await supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', msg.user_id)
                    .eq('wa_to', status.recipient_id)
                    .eq('status', 'failed')
                    .in('error_bucket', [...HARD_BOUNCE_BUCKETS])
                    .gte('failed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

                  if ((count ?? 0) >= 3) {
                    await supabase.from('contacts')
                      .update({
                        is_blacklisted: true,
                        blacklist_reason: 'hard_bounce',
                        updated_at: new Date().toISOString(),
                      })
                      .eq('user_id', msg.user_id)
                      .eq('phone_number', status.recipient_id);
                    console.log(`[webhook] Auto-blacklisted ${status.recipient_id} after 3+ hard bounces`);
                  }
                }
              }
            }
          }

          // 2) Inbound messages from customers
          if (account) {
            // Business phone number that received this webhook event
            const businessPhone = value.metadata?.display_phone_number?.replace(/[^0-9]/g, '') || '';

            for (const msg of value.messages ?? []) {
              // Extract message text for preview
              let messagePreview = '';
              let mediaUrl: string | null = null;
              const msgType = msg.type || 'text';

              if (msgType === 'text') {
                messagePreview = msg.text?.body || '';
              } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(msgType)) {
                const mediaObj = msg[msgType];
                messagePreview = mediaObj?.caption || `📎 ${msgType}`;
                // Download and store media
                if (mediaObj?.id) {
                  // Decrypt WABA token for media download
                  const { data: mediaAccessToken } = await supabase.rpc('get_waba_access_token', { p_account_id: account.id });
                  if (mediaAccessToken) {
                    mediaUrl = await downloadAndStoreMedia(
                      mediaObj.id,
                      mediaAccessToken,
                      account.user_id,
                      mediaObj.mime_type || 'application/octet-stream',
                    );
                  }
                }
              } else if (msgType === 'button') {
                // Quick-reply button tap (e.g. from a template button)
                messagePreview = msg.button?.text || 'Button reply';
              } else if (msgType === 'interactive') {
                // Interactive message reply (button_reply or list_reply)
                if (msg.interactive?.type === 'button_reply') {
                  messagePreview = msg.interactive.button_reply?.title || 'Button reply';
                } else if (msg.interactive?.type === 'list_reply') {
                  messagePreview = msg.interactive.list_reply?.title || 'List selection';
                } else {
                  messagePreview = msg.interactive?.button_reply?.title
                    || msg.interactive?.list_reply?.title
                    || 'Interactive reply';
                }
              } else if (msgType === 'reaction') {
                messagePreview = msg.reaction?.emoji || '👍';
              } else if (msgType === 'location') {
                messagePreview = `📍 Location: ${msg.location?.latitude}, ${msg.location?.longitude}`;
              } else if (msgType === 'contacts') {
                messagePreview = `👤 Contact shared`;
              } else {
                messagePreview = `[${msgType}]`;
              }

              // Get contact name from WhatsApp profile
              const contactName = value.contacts?.[0]?.profile?.name || null;

              // Upsert conversation — get its id BEFORE inserting the message
              const conversationId = await upsertConversation(
                account.user_id,
                account.id,
                msg.from,
                contactName,
                messagePreview,
              );

              // Insert the message with conversation_id and wa_to
              const { error: insErr } = await supabase.from('messages').insert({
                user_id: account.user_id,
                whatsapp_account_id: account.id,
                wamid: msg.id,
                direction: 'inbound',
                wa_from: msg.from,
                wa_to: businessPhone,
                message_type: msgType,
                content: msg,
                status: 'received',
                media_url: mediaUrl,
                conversation_id: conversationId,
                created_at: tsToIso(msg.timestamp),
              });
              // ── Fire-and-forget hooks: flow-engine + journey-engine ──
              // Runs AFTER message insert succeeds. Both engines are called
              // independently — neither swallows the other.
              if (!insErr) {
                const HOOK_URL = Deno.env.get('SUPABASE_URL') ?? '';
                const HOOK_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
                const hookHeaders = {
                  'Authorization': `Bearer ${HOOK_KEY}`,
                  'Content-Type': 'application/json',
                };

                // A) Flow-engine: forward ALL inbound messages for trigger matching
                //    (keyword, any_message, new_conversation, button/question answers)
                if (conversationId) {
                  const buttonId =
                    msgType === 'button' ? (msg.button?.payload || msg.button?.text) :
                    msgType === 'interactive' ? (msg.interactive?.button_reply?.id || msg.interactive?.button_reply?.title) :
                    undefined;

                  fetch(`${HOOK_URL}/functions/v1/flow-engine`, {
                    method: 'POST',
                    headers: hookHeaders,
                    body: JSON.stringify({
                      conversation_id: conversationId,
                      trigger: 'inbound',
                      text: msgType === 'text' ? (msg.text?.body ?? '') : messagePreview,
                      button_id: buttonId,
                      is_new: false, // conversation was just upserted, not truly "new"
                    }),
                  }).catch(() => {}); // fire-and-forget
                }

                // B) Journey-engine: forward button/interactive replies for waiting_reply executions
                if (msgType === 'button' || msgType === 'interactive') {
                  const buttonPayload =
                    msgType === 'button' ? (msg.button?.payload || msg.button?.text) :
                    (msg.interactive?.button_reply?.id || msg.interactive?.button_reply?.title);

                  if (buttonPayload) {
                    fetch(`${HOOK_URL}/functions/v1/journey-engine`, {
                      method: 'POST',
                      headers: hookHeaders,
                      body: JSON.stringify({
                        action: 'inbound_reply',
                        phone: msg.from,
                        button_payload: buttonPayload,
                        user_id: account.user_id,
                      }),
                    }).catch(() => {}); // fire-and-forget
                  }
                }
              }

              // 23505 = duplicate wamid (Meta retried) — safe to ignore
              if (insErr && insErr.code !== '23505') {
                console.error(
                  `[whatsapp-webhook] INBOUND INSERT FAILED for wamid=${msg.id} from=${msg.from}:`,
                  insErr.code, insErr.message, insErr.details,
                );
                // Rollback the conversation preview to avoid phantom preview with no message.
                // Decrement unread_count and clear the preview if this was the only message.
                if (conversationId) {
                  await supabase
                    .from('conversations')
                    .update({
                      unread_count: 0,
                      last_message_preview: '[message failed to save]',
                    })
                    .eq('id', conversationId);
                }
              }
            }
          }

          if (change.field === 'message_template_status_update') {
            const evt = value as Record<string, any>;
            const metaTemplateId = evt.message_template_id != null ? String(evt.message_template_id) : null;
            const normalizedStatus = String(evt.event ?? 'pending').toLowerCase();
            if (metaTemplateId) {
              const { error: tplErr } = await supabase
                .from('templates')
                .update({
                  status: normalizedStatus,
                  rejected_reason: evt.reason ?? null,
                  updated_at: new Date().toISOString(),
                })
                .eq('meta_template_id', metaTemplateId);
              if (tplErr) console.error('Template status update error:', tplErr.message);
            }
          }

          // 4) Account quality updates — auto-pause marketing on yellow/red
          if (change.field === 'phone_number_quality_update' ||
              change.field === 'account_update') {
            const evt = value as Record<string, any>;
            const qualityRating = evt.current_limit
              ?? evt.quality_rating ?? null;
            const displayPhoneNumber = evt.display_phone_number;

            if (qualityRating && displayPhoneNumber) {
              const cleanPhone = String(displayPhoneNumber).replace(/[^0-9]/g, '');
              const isHealthy = /green/i.test(String(qualityRating));
              const isDegraded = /yellow|red|flagged/i.test(String(qualityRating));

              const accountPatch: Record<string, unknown> = {
                quality_rating: String(qualityRating).toLowerCase(),
                updated_at: new Date().toISOString(),
              };

              if (isDegraded) {
                // Auto-pause marketing sends to protect the number
                accountPatch.marketing_paused = true;
                accountPatch.marketing_paused_reason =
                  `Quality dropped to ${qualityRating} — marketing auto-paused at ${new Date().toISOString()}`;
                console.warn(`[webhook] WABA ${cleanPhone} quality=${qualityRating} — marketing auto-paused`);
              } else if (isHealthy) {
                // Resume marketing when quality recovers
                accountPatch.marketing_paused = false;
                accountPatch.marketing_paused_reason = null;
                console.log(`[webhook] WABA ${cleanPhone} quality=${qualityRating} — marketing resumed`);
              }

              await supabase.from('whatsapp_accounts')
                .update(accountPatch)
                .eq('display_phone_number', displayPhoneNumber);
            }
          }
        }
      }
    } catch (e) {
      console.error('Webhook processing error:', (e as Error).message);
    }

    return new Response('EVENT_RECEIVED', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
});
