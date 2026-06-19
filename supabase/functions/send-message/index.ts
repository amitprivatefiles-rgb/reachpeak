// Supabase Edge Function: send-message
// Sends a REAL WhatsApp message via the Meta Cloud API (Graph API) and logs it.
//
// Deploy:  supabase functions deploy send-message
// Secret:  supabase secrets set GRAPH_API_VERSION=v23.0
//          (set this to match the version in YOUR Meta console's curl example)
//          SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Called by the authenticated frontend with the user's Supabase JWT.
// The phone_number_id + access_token are looked up server-side from the
// caller's OWN whatsapp_accounts row — the client never supplies them.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GRAPH_API_VERSION = Deno.env.get('GRAPH_API_VERSION') || 'v23.0';

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

    // 1. Authenticate the caller (their Supabase JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authorization header required' }, 401);
    const { data: { user }, error: authErr } =
      await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    // 2. Parse the request
    const {
      to,                  // recipient phone, international format w/o +, e.g. 916290678045
      type = 'template',   // 'template' | 'text'
      template,            // { name, language, components } for templates
      text,                // string for free-form text (only valid inside 24h window)
      contact_id = null,
      campaign_id = null,
    } = await req.json();

    if (!to) return json({ error: 'Missing "to" phone number' }, 400);

    // 3. Load the caller's connected WhatsApp account (token + phone_number_id)
    const { data: account, error: acctErr } = await supabase
      .from('whatsapp_accounts')
      .select('id, phone_number_id, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (acctErr) return json({ error: 'Account lookup failed: ' + acctErr.message }, 500);
    if (!account) return json({ error: 'No active WhatsApp account connected for this user' }, 400);

    // 4. Build the Cloud API payload
    let payload: Record<string, unknown>;
    if (type === 'text') {
      if (!text) return json({ error: 'Missing "text" for a text message' }, 400);
      payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
    } else {
      if (!template?.name) return json({ error: 'Missing template.name' }, 400);
      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language || 'en_US' },
          ...(template.components ? { components: template.components } : {}),
        },
      };
    }

    // 5. Call the Graph API with the tenant's own token
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

    // 6. Log the message either way
    const baseRow = {
      user_id: user.id,
      whatsapp_account_id: account.id,
      contact_id,
      campaign_id,
      direction: 'outbound',
      wa_to: to,
      message_type: type,
      template_name: type === 'template' ? (template?.name ?? null) : null,
      content: payload,
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

    if (insErr) {
      // Sent on WhatsApp but DB log failed — be honest, don't pretend it failed.
      return json({ success: true, wamid, warning: 'Sent but log insert failed: ' + insErr.message });
    }

    return json({ success: true, wamid, message: inserted });
  } catch (e) {
    return json({ error: 'Internal error: ' + ((e as Error).message || 'unknown') }, 500);
  }
});
