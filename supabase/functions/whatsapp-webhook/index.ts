// Supabase Edge Function: whatsapp-webhook
// Receives WhatsApp Cloud API webhooks — delivery/read/failed statuses and
// inbound customer messages. THIS is what replaces the simulated counters
// with real data: every status update and reply lands here.
//
// Deploy PUBLIC (Meta calls it with NO Supabase JWT — this flag is required):
//   supabase functions deploy whatsapp-webhook --no-verify-jwt
//
// Secrets:
//   supabase secrets set WHATSAPP_VERIFY_TOKEN=pick-a-long-random-string
//   supabase secrets set WHATSAPP_APP_SECRET=your_meta_app_secret   (recommended)
//   (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically)
//
// Then in Meta → WhatsApp → Configuration → Edit webhook:
//   Callback URL = https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook
//   Verify token = the WHATSAPP_VERIFY_TOKEN value above
//   Save, then click "Manage" and subscribe to the "messages" field.

import { createClient } from 'npm:@supabase/supabase-js@2';

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || '';
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET') || '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Verify Meta's X-Hub-Signature-256 (HMAC-SHA256 of the raw body using the app secret)
async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!APP_SECRET) return true; // skipped until you set the secret — DO set it for production
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

function tsToIso(ts?: string): string {
  const n = ts ? parseInt(ts, 10) : NaN;
  return Number.isFinite(n) ? new Date(n * 1000).toISOString() : new Date().toISOString();
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
          let account: { id: string; user_id: string } | null = null;
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
            }
            if (status.pricing) {
              patch.conversation_category = status.pricing.category ?? null;
              patch.pricing_billable = status.pricing.billable ?? null;
            }
            if (status.id) {
              await supabase.from('messages').update(patch).eq('wamid', status.id);
            }
          }

          // 2) Inbound messages from customers
          if (account) {
            for (const msg of value.messages ?? []) {
              const { error: insErr } = await supabase.from('messages').insert({
                user_id: account.user_id,
                whatsapp_account_id: account.id,
                wamid: msg.id,
                direction: 'inbound',
                wa_from: msg.from,
                message_type: msg.type,
                content: msg,
                status: 'received',
              });
              // 23505 = duplicate wamid (Meta retried) — safe to ignore
              if (insErr && insErr.code !== '23505') {
                console.error('Inbound insert error:', insErr.message);
              }
            }
          }

          // 3) Template approval status updates (field: message_template_status_update)
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
        }
      }
    } catch (e) {
      // Log but still 200 so Meta doesn't retry a poison event forever
      console.error('Webhook processing error:', (e as Error).message);
    }

    // Always ack fast so Meta marks delivery successful
    return new Response('EVENT_RECEIVED', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
});
