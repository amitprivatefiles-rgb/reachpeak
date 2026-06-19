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
      .select('id, phone_number_id, access_token, display_phone_number')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (acctErr) return json({ error: 'Account lookup failed: ' + acctErr.message }, 500);
    if (!account) return json({ error: 'No active WhatsApp account connected' }, 400);

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
      default:
        if (!template?.name) return json({ error: 'Missing template.name' }, 400);
        messageType = 'template';
        payload = {
          messaging_product: 'whatsapp', to, type: 'template',
          template: {
            name: template.name,
            language: { code: template.language || 'en_US' },
            ...(template.components ? { components: template.components } : {}),
          },
        };
        break;
    }

    // 5. Call the Graph API
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.phone_number_id}/messages`;
    const waRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
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
