// Supabase Edge Function: support
// User-facing support + onboarding-choice API (user JWT auth).
// Actions:
//   set_onboarding_choice → record 'own_billing' | 'wallet' (wallet → notify support)
//   create_ticket         → open a support ticket (+ confirm to user, alert support)
//   list_tickets          → caller's tickets
//   request_callback      → request a phone call-back (+ confirm to user, alert support)
//   list_callbacks        → caller's callback requests
//   get_status            → caller's onboarding_choice + counts
//
// Deploy: supabase functions deploy support --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { notify, SUPPORT_PHONE } from '../_shared/notify.ts';

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

function shortId(id: string) { return id.slice(0, 8); }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // ── Auth: user JWT ──
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Auth required' }, 401);
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: prof } = await db.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle();
    const callerName = prof?.full_name || prof?.email || 'Customer';

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ─────────────── set_onboarding_choice ───────────────
    if (action === 'set_onboarding_choice') {
      const choice = body.choice;
      if (!['own_billing', 'wallet'].includes(choice)) return json({ error: 'bad choice' }, 400);
      // own_billing completes on WABA connect+payment; wallet completes after support sets up.
      await db.from('profiles').update({ onboarding_choice: choice, updated_at: new Date().toISOString() }).eq('id', user.id);

      if (choice === 'wallet') {
        // Alert support that a user wants the managed wallet plan.
        await notify(db, {
          to_phone: SUPPORT_PHONE, audience: 'support',
          template_name: 'wallet_signup_alert', language: 'en',
          params: [callerName, prof?.email || user.email || '—'],
          related_type: 'onboarding', related_id: user.id,
        });
      }
      return json({ ok: true, choice });
    }

    // ─────────────── create_ticket ───────────────
    if (action === 'create_ticket') {
      const subject = (body.subject ?? '').toString().trim().slice(0, 200);
      const message = (body.message ?? '').toString().trim().slice(0, 4000);
      const category = ['general','billing','technical','whatsapp','account','other'].includes(body.category) ? body.category : 'general';
      const contact_phone = (body.contact_phone ?? '').toString().replace(/[^0-9]/g, '').slice(0, 15) || null;
      if (!subject || !message) return json({ error: 'subject and message are required' }, 400);

      const { data: ticket, error } = await db.from('support_tickets').insert({
        user_id: user.id, subject, message, category, contact_phone,
      }).select('id, subject, status, created_at').single();
      if (error) return json({ error: 'Could not create ticket: ' + error.message }, 500);

      // Confirm to the user (if they gave a phone) + alert support.
      if (contact_phone) {
        await notify(db, {
          to_phone: contact_phone, audience: 'user',
          template_name: 'ticket_received', language: 'en',
          params: [callerName, shortId(ticket.id)],
          related_type: 'ticket', related_id: ticket.id,
        });
      }
      await notify(db, {
        to_phone: SUPPORT_PHONE, audience: 'support',
        template_name: 'ticket_alert', language: 'en',
        params: [callerName, subject, shortId(ticket.id)],
        related_type: 'ticket', related_id: ticket.id,
      });
      return json({ ok: true, ticket });
    }

    // ─────────────── list_tickets ───────────────
    if (action === 'list_tickets') {
      const { data } = await db.from('support_tickets')
        .select('id, subject, message, category, status, priority, created_at, updated_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
      return json({ ok: true, tickets: data ?? [] });
    }

    // ─────────────── request_callback ───────────────
    if (action === 'request_callback') {
      const name = (body.name ?? callerName).toString().trim().slice(0, 120);
      const phone = (body.phone ?? '').toString().replace(/[^0-9]/g, '').slice(0, 15);
      const reason = (body.reason ?? '').toString().trim().slice(0, 500) || null;
      const preferred_time = (body.preferred_time ?? '').toString().trim().slice(0, 120) || null;
      if (!phone || phone.length < 10) return json({ error: 'A valid phone number is required' }, 400);

      const { data: cb, error } = await db.from('callback_requests').insert({
        user_id: user.id, name, phone, reason, preferred_time,
      }).select('id, phone, status, created_at').single();
      if (error) return json({ error: 'Could not request callback: ' + error.message }, 500);

      // Confirm to the user + alert support.
      await notify(db, {
        to_phone: phone, audience: 'user',
        template_name: 'callback_confirmation', language: 'en',
        params: [name, phone],
        related_type: 'callback', related_id: cb.id,
      });
      await notify(db, {
        to_phone: SUPPORT_PHONE, audience: 'support',
        template_name: 'callback_alert', language: 'en',
        params: [name, phone, reason || '—'],
        related_type: 'callback', related_id: cb.id,
      });
      return json({ ok: true, callback: cb });
    }

    // ─────────────── list_callbacks ───────────────
    if (action === 'list_callbacks') {
      const { data } = await db.from('callback_requests')
        .select('id, name, phone, reason, preferred_time, status, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
      return json({ ok: true, callbacks: data ?? [] });
    }

    // ─────────────── get_status ───────────────
    if (action === 'get_status') {
      const { data: p } = await db.from('profiles').select('onboarding_choice, onboarding_completed').eq('id', user.id).maybeSingle();
      return json({ ok: true, onboarding_choice: p?.onboarding_choice ?? null, onboarding_completed: !!p?.onboarding_completed, support_phone: SUPPORT_PHONE });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (err: any) {
    console.error('[support] error', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
