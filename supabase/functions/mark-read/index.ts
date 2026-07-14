// Supabase Edge Function: mark-read
// Marks a conversation as read (resets unread_count to 0)
// Optionally sends read receipts to WhatsApp
//
// Deploy: supabase functions deploy mark-read --no-verify-jwt

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

    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authorization required' }, 401);
    const { data: { user }, error: authErr } =
      await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { conversation_id } = await req.json();
    if (!conversation_id) return json({ error: 'Missing conversation_id' }, 400);

    // Verify ownership
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, user_id, contact_phone, whatsapp_account_id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (convErr || !conv) return json({ error: 'Conversation not found' }, 404);

    // Reset unread count
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversation_id);

    // Send read receipts for unread inbound messages
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('wamid')
      .eq('conversation_id', conversation_id)
      .eq('direction', 'inbound')
      .eq('status', 'received')
      .not('wamid', 'is', null);

    if (unreadMessages && unreadMessages.length > 0 && conv.whatsapp_account_id) {
      // Get account info
      const { data: account } = await supabase
        .from('whatsapp_accounts')
        .select('id, phone_number_id')
        .eq('id', conv.whatsapp_account_id)
        .maybeSingle();

      if (account) {
        // Decrypt WABA token from Vault
        const { data: accessToken } = await supabase.rpc('get_waba_access_token', { p_account_id: account.id });

        if (accessToken) {
        // Send read receipts (fire and forget — don't block the response)
        for (const msg of unreadMessages) {
          if (msg.wamid) {
            fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.phone_number_id}/messages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  status: 'read',
                  message_id: msg.wamid,
                }),
              },
            ).catch(() => {}); // fire and forget
          }
        }
        } // end if (accessToken)

        // Mark messages as read in our DB
        await supabase
          .from('messages')
          .update({ status: 'read', read_at: new Date().toISOString() })
          .eq('conversation_id', conversation_id)
          .eq('direction', 'inbound')
          .eq('status', 'received');
      }
    }

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
