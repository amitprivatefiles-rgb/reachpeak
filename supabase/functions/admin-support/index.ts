// Supabase Edge Function: admin-support
// Admin console for tickets + callbacks. JWT + role='admin' required.
// Actions: list (tickets|callbacks|all), update_ticket, update_callback, stats
//
// Deploy: supabase functions deploy admin-support --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Auth required' }, 401);
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);
    const { data: prof } = await db.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
    if (!prof || prof.role !== 'admin' || !prof.is_active) return json({ error: 'Admin only' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'list') {
      const kind = body.kind || 'all';
      if (kind === 'tickets') {
        const { data } = await db.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(500);
        return json({ ok: true, tickets: data ?? [] });
      }
      if (kind === 'callbacks') {
        const { data } = await db.from('callback_requests').select('*').order('created_at', { ascending: false }).limit(500);
        return json({ ok: true, callbacks: data ?? [] });
      }
      // all → the unified overview view + full rows
      const [{ data: tickets }, { data: callbacks }] = await Promise.all([
        db.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(500),
        db.from('callback_requests').select('*').order('created_at', { ascending: false }).limit(500),
      ]);
      return json({ ok: true, tickets: tickets ?? [], callbacks: callbacks ?? [] });
    }

    if (action === 'update_ticket') {
      const id = (body.id ?? '').toString();
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (body.status && ['open','in_progress','resolved','closed'].includes(body.status)) patch.status = body.status;
      if (body.priority && ['low','normal','high','urgent'].includes(body.priority)) patch.priority = body.priority;
      if (typeof body.admin_notes === 'string') patch.admin_notes = body.admin_notes.slice(0, 2000);
      if (!id) return json({ error: 'id required' }, 400);
      await db.from('support_tickets').update(patch).eq('id', id);
      return json({ ok: true });
    }

    if (action === 'update_callback') {
      const id = (body.id ?? '').toString();
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (body.status && ['requested','contacted','done','cancelled'].includes(body.status)) patch.status = body.status;
      if (typeof body.admin_notes === 'string') patch.admin_notes = body.admin_notes.slice(0, 2000);
      if (!id) return json({ error: 'id required' }, 400);
      await db.from('callback_requests').update(patch).eq('id', id);
      return json({ ok: true });
    }

    if (action === 'stats') {
      const [{ count: openTickets }, { count: pendingCallbacks }, { count: queuedNotifs }] = await Promise.all([
        db.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open','in_progress']),
        db.from('callback_requests').select('id', { count: 'exact', head: true }).in('status', ['requested','contacted']),
        db.from('notification_outbox').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
      ]);
      return json({ ok: true, open_tickets: openTickets ?? 0, pending_callbacks: pendingCallbacks ?? 0, queued_notifications: queuedNotifs ?? 0 });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (err: any) {
    console.error('[admin-support] error', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
