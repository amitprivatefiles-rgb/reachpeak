// Supabase Edge Function: partner-callbacks
// Reconciliation endpoint — PeakCart can poll for unacked callbacks.
// Returns callbacks that were not ACKed (status = 'pending' or 'delivered' without ack).
//
// Auth: API key (same as partner-send / ingest-event)
// Deploy: supabase functions deploy partner-callbacks --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 200, headers: corsHeaders });

  try {
    /* ── Auth ── */
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'API key required' }, 401);

    const keyHash = await sha256(token);
    const { data: integration } = await db
      .from('integration_keys')
      .select('id, user_id, is_active')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .maybeSingle();

    if (!integration) return json({ error: 'Invalid API key' }, 401);

    const userId = integration.user_id;

    if (req.method === 'GET') {
      /* ── GET: List unacked callbacks (pending or failed_permanent) ── */
      const url = new URL(req.url);
      const since = url.searchParams.get('since'); // ISO date filter
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500);
      const includeAcked = url.searchParams.get('include_acked') === 'true';

      let query = db.from('callback_log')
        .select('callback_id, type, payload, status, attempts, created_at, acked_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!includeAcked) {
        query = query.in('status', ['pending', 'failed_permanent']);
      }
      if (since) {
        query = query.gte('created_at', since);
      }

      const { data: callbacks, error } = await query;
      if (error) return json({ error: error.message }, 500);

      return json({ callbacks: callbacks ?? [], count: callbacks?.length ?? 0 });

    } else if (req.method === 'POST') {
      /* ── POST: ACK one or more callbacks ── */
      const body = await req.json();
      const { callback_ids } = body;

      if (!callback_ids || !Array.isArray(callback_ids) || callback_ids.length === 0) {
        return json({ error: 'callback_ids (array of UUIDs) is required' }, 400);
      }

      if (callback_ids.length > 100) {
        return json({ error: 'Max 100 callback_ids per ACK request' }, 400);
      }

      const { count, error } = await db.from('callback_log')
        .update({
          status: 'delivered',
          acked_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .in('callback_id', callback_ids)
        .eq('status', 'pending');

      if (error) return json({ error: error.message }, 500);

      return json({ acked: count ?? 0 });

    } else {
      return json({ error: 'Method not allowed' }, 405);
    }

  } catch (err: any) {
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
