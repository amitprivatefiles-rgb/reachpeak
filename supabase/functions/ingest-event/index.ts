// Supabase Edge Function: ingest-event
// Receives store events via API key auth.
// Delegates to shared eventPipeline for processing.
//
// Auth:   API key in Authorization header (Bearer rpk_live_...)
// Deploy: supabase functions deploy ingest-event --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { normalizePhone, runPipeline } from '../_shared/eventPipeline.ts';

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
  // Phase 3 additions
  'order_confirmed', 'order_rto', 'order_returned', 'order_refunded', 'prepay_nudge',
]);

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
    const { event_type, dedupe_key, contact, payload = {} } = body;

    if (!event_type || !ALLOWED_EVENTS.has(event_type))
      return json({ error: `Invalid event_type. Allowed: ${[...ALLOWED_EVENTS].join(', ')}` }, 400);
    if (!dedupe_key)
      return json({ error: 'dedupe_key is required' }, 400);

    /* ── 3. Run shared pipeline ── */
    const phone = normalizePhone(contact?.phone);
    const contactName = contact?.name ?? null;

    const result = await runPipeline(db, SUPABASE_URL, SERVICE_ROLE, {
      userId: integration.user_id,
      source: integration.source,
      eventType: event_type,
      dedupeKey: dedupe_key,
      phone,
      contactName,
      payload,
    });

    if (!result.ok) {
      return json({ error: result.error }, result.deduped ? 200 : 500);
    }

    if (result.deduped) {
      return json({ ok: true, deduped: true });
    }

    console.log(`[ingest-event] event=${result.eventId} type=${event_type} phone=${phone} source=${integration.source} risk=${result.riskScore ?? 'n/a'}`);
    return json({
      ok: true,
      event_id: result.eventId,
      risk_score: result.riskScore,
      risk_band: result.riskBand,
    });

  } catch (err: any) {
    console.error('[ingest-event] Unhandled error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
