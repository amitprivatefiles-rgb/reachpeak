// Supabase Edge Function: send-message
// Sends WhatsApp messages via Meta Cloud API — supports text, template, image, 
// document, video, audio. Logs every message and updates conversations.
//
// Deploy:  supabase functions deploy send-message --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GRAPH_API_VERSION = Deno.env.get('GRAPH_API_VERSION') || 'v25.0';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authorization header required' }, 401);
    const { data: { user }, error: authErr } =
      await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    // 2. Parse the request
    const {
      to,
      type = 'template',
      template,
      text,
      media_url,
      caption,
      filename,
      contact_id = null,
      campaign_id = null,
      conversation_id = null,
    } = await req.json();

    if (!to) return json({ error: 'Missing "to" phone number' }, 400);

    // 3. Load the caller's WhatsApp account
    const { data: account, error: acctErr } = await supabase
      .from('whatsapp_accounts')
      .select('id, phone_number_id, display_phone_number')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (acctErr) return json({ error: 'Account lookup failed: ' + acctErr.message }, 500);
    if (!account) return json({ error: 'No active WhatsApp account connected' }, 400);

    // Decrypt WABA token from Vault
    const { data: accessToken, error: tokenErr } = await supabase.rpc('get_waba_access_token', { p_account_id: account.id });
    if (tokenErr || !accessToken) return json({ error: 'Failed to decrypt WhatsApp credentials' }, 500);

    // 4. Build the Cloud API payload
    let payload: Record<string, unknown>;
    let messageType = type;

    switch (type) {
      case 'text':
        if (!text) return json({ error: 'Missing "text" for a text message' }, 400);
        payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
        break;

      case 'image':
        if (!media_url) return json({ error: 'Missing "media_url" for image' }, 400);
        payload = {
          messaging_product: 'whatsapp', to, type: 'image',
          image: { link: media_url, ...(caption ? { caption } : {}) },
        };
        break;

      case 'document':
        if (!media_url) return json({ error: 'Missing "media_url" for document' }, 400);
        payload = {
          messaging_product: 'whatsapp', to, type: 'document',
          document: { link: media_url, ...(caption ? { caption } : {}), ...(filename ? { filename } : {}) },
        };
        break;

      case 'video':
        if (!media_url) return json({ error: 'Missing "media_url" for video' }, 400);
        payload = {
          messaging_product: 'whatsapp', to, type: 'video',
          video: { link: media_url, ...(caption ? { caption } : {}) },
        };
        break;

      case 'audio':
        if (!media_url) return json({ error: 'Missing "media_url" for audio' }, 400);
        payload = {
          messaging_product: 'whatsapp', to, type: 'audio',
          audio: { link: media_url },
        };
        break;

      case 'template':
      default: {
        if (!template?.name) return json({ error: 'Missing template.name' }, 400);
        messageType = 'template';

        // Load the stored template to build correct send components
        const { data: storedTpl } = await supabase
          .from('templates')
          .select('name, language, components, body_text, header_sample_url')
          .eq('whatsapp_account_id', account.id)
          .eq('name', template.name)
          .limit(1)
          .maybeSingle();

        // Import shared builder (Deno file import)
        const { buildTemplateSendComponents, missingRequiredHeaderMedia } =
          await import('../_shared/templatePayload.ts');

        const inputs = {
          headerMedia: template.headerMedia,
          headerTextParams: template.headerTextParams,
          bodyParams: template.bodyParams ?? [],
          buttonParams: template.buttonParams ?? [],
        };

        // If we found the template in DB, use the builder; otherwise fall back
        // to caller-provided components (for backward compat with raw payloads)
        let sendComponents: any[] | undefined;
        if (storedTpl) {
          if (missingRequiredHeaderMedia(storedTpl, inputs)) {
            return json({ error: 'This template requires a header image/video/document but none is available.' }, 400);
          }
          sendComponents = buildTemplateSendComponents(storedTpl, inputs);
        } else if (template.components) {
          // Fallback: caller passed raw components (e.g. pre-built by campaign enqueue)
          sendComponents = template.components;
        }

        payload = {
          messaging_product: 'whatsapp', to, type: 'template',
          template: {
            name: template.name,
            language: { code: template.language || storedTpl?.language || 'en_US' },
            ...(sendComponents && sendComponents.length > 0 ? { components: sendComponents } : {}),
          },
        };
        break;
      }
    }

    // 5. Call the Graph API
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.phone_number_id}/messages`;
    const waRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const waData = await waRes.json();

    // 6. Log the message
    const baseRow = {
      user_id: user.id,
      whatsapp_account_id: account.id,
      contact_id,
      campaign_id,
      conversation_id,
      direction: 'outbound',
      wa_from: account.display_phone_number?.replace(/[^0-9]/g, '') || null,
      wa_to: to,
      message_type: messageType,
      template_name: messageType === 'template' ? (template?.name ?? null) : null,
      content: payload,
      media_url: media_url || null,
    };

    if (!waRes.ok) {
      const err = waData?.error;
      await supabase.from('messages').insert({
        ...baseRow,
        status: 'failed',
        error_code: err?.code ? String(err.code) : null,
        error_message: err?.message || 'Send failed',
        failed_at: new Date().toISOString(),
      });
      return json({ error: 'WhatsApp send failed', details: err }, waRes.status);
    }

    const wamid = waData?.messages?.[0]?.id ?? null;
    const { data: inserted, error: insErr } = await supabase
      .from('messages')
      .insert({ ...baseRow, wamid, status: 'sent', sent_at: new Date().toISOString() })
      .select()
      .single();

    // 7. Update conversation if this is a reply from the inbox
    if (conversation_id) {
      const messagePreview = type === 'text' ? (text || '').substring(0, 100)
        : type === 'template' ? `📋 Template: ${template?.name}`
        : `📎 ${type}`;

      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messagePreview,
          last_message_direction: 'outbound',
        })
        .eq('id', conversation_id);
    }

    if (insErr) {
      return json({ success: true, wamid, warning: 'Sent but log insert failed: ' + insErr.message });
    }

    return json({ success: true, wamid, message: inserted });
  } catch (e) {
    return json({ error: 'Internal error: ' + ((e as Error).message || 'unknown') }, 500);
  }
});
