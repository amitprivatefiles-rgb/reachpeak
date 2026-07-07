// Supabase Edge Function: ingest-event
// Receives store events (cart abandoned, order created, etc.) via API key auth.
// Normalizes phone, upserts contact, stores event (idempotent dedupe),
// and fires journey-engine to process automations.
//
// Auth:   API key in Authorization header (Bearer rpk_live_...)
// Deploy: supabase functions deploy ingest-event --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

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

const ALLOWED_EVENTS = new Set([
  'cart_abandoned', 'checkout_started', 'order_created', 'order_paid',
  'order_shipped', 'order_delivered', 'order_cancelled', 'cod_pending',
  'customer_created', 'custom',
]);

// ── Phone normalization ──
function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 0) return null;
  // Indian 10-digit → prefix 91
  if (digits.length === 10) return '91' + digits;
  // Already has country code
  return digits;
}

// ── SHA-256 hash ──
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Simple in-memory rate limiter ──
const rateCounts = new Map<string, { count: number; resetAt: number }>();
function checkRate(keyHash: string): boolean {
  const now = Date.now();
  let entry = rateCounts.get(keyHash);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 };
    rateCounts.set(keyHash, entry);
  }
  entry.count++;
  return entry.count <= 600; // 600/min
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    /* ── 1. Authenticate via API key ── */
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'API key required' }, 401);

    const keyHash = await sha256(token);

    const { data: integration, error: keyErr } = await db
      .from('integration_keys')
      .select('id, user_id, source, is_active, callback_url, callback_secret')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .maybeSingle();

    if (keyErr || !integration)
      return json({ error: 'Invalid or inactive API key' }, 401);

    // Rate limit
    if (!checkRate(keyHash))
      return json({ error: 'Rate limit exceeded (600/min)' }, 429);

    // Update last_used_at (fire-and-forget)
    db.from('integration_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', integration.id)
      .then(() => {});

    /* ── 2. Parse and validate body ── */
    const body = await req.json();
    const {
      event_type,
      dedupe_key,
      contact,
      payload = {},
    } = body;

    if (!event_type || !ALLOWED_EVENTS.has(event_type))
      return json({ error: `Invalid event_type. Allowed: ${[...ALLOWED_EVENTS].join(', ')}` }, 400);
    if (!dedupe_key)
      return json({ error: 'dedupe_key is required' }, 400);

    /* ── 3. Normalize phone ── */
    const phone = normalizePhone(contact?.phone);
    const contactName = contact?.name ?? null;

    /* ── 4. Upsert contact (if phone provided) ── */
    if (phone) {
      // Check if contact exists
      const { data: existing } = await db
        .from('contacts')
        .select('id')
        .eq('user_id', integration.user_id)
        .eq('phone_number', phone)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update name if provided and currently empty
        if (contactName) {
          await db.from('contacts')
            .update({
              name: contactName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .is('name', null);  // only update if name is null
        }
      } else {
        // Insert new contact
        const { error: insertErr } = await db.from('contacts').insert({
          user_id: integration.user_id,
          phone_number: phone,
          name: contactName,
          source: integration.source,
          lead_type: 'Warm',
        });
        if (insertErr && insertErr.code !== '23505') {
          console.error('[ingest-event] Contact insert error:', insertErr.message);
        }
      }
    }

    /* ── 5. Insert event (idempotent dedupe) ── */
    const { data: eventRow, error: eventErr } = await db
      .from('events')
      .insert({
        user_id: integration.user_id,
        source: integration.source,
        event_type,
        contact_phone: phone,
        contact_name: contactName,
        dedupe_key,
        payload,
        status: 'received',
      })
      .select('id')
      .single();

    if (eventErr) {
      // 23505 = unique violation = dedupe hit
      if (eventErr.code === '23505') {
        return json({ ok: true, deduped: true });
      }
      console.error('[ingest-event] Event insert error:', eventErr.message);
      return json({ error: eventErr.message }, 500);
    }

    const eventId = eventRow!.id;

    /* ── 6. Fire-and-forget → journey-engine ── */
    fetch(`${SUPABASE_URL}/functions/v1/journey-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_id: eventId }),
    }).catch((err) => {
      console.error('[ingest-event] journey-engine invoke error:', err.message);
    });

    /* ── 7. Return ── */
    console.log(`[ingest-event] event=${eventId} type=${event_type} phone=${phone} source=${integration.source}`);
    return json({ ok: true, event_id: eventId });

  } catch (err: any) {
    console.error('[ingest-event] Unhandled error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
