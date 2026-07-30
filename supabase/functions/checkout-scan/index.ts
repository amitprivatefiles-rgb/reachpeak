// Supabase Edge Function: checkout-scan
// Called by pg_cron (via pg_net) every 5 minutes.
// Runs the abandoned checkout scan (DB function) and triggers
// journey-engine for each synthesized cart_abandoned event.
//
// A raw DB INSERT does NOT trigger journeys — this function
// bridges that gap by calling journey-engine for each new event.
//
// Deploy: supabase functions deploy checkout-scan --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  // Only accept POST (from pg_net cron or manual invocation)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Run the scan — returns newly-created cart_abandoned events
    const { data: newEvents, error: scanErr } = await db.rpc('scan_abandoned_checkouts');

    if (scanErr) {
      console.error('[checkout-scan] Scan error:', scanErr.message);
      return new Response(JSON.stringify({ error: scanErr.message }), { status: 500 });
    }

    if (!newEvents || newEvents.length === 0) {
      return new Response(JSON.stringify({ scanned: true, synthesized: 0 }), { status: 200 });
    }

    console.log(`[checkout-scan] Synthesized ${newEvents.length} cart_abandoned events`);

    // 2. Trigger journey-engine for each new event (fire-and-forget, like eventPipeline)
    let triggered = 0;
    for (const evt of newEvents) {
      try {
        // Mark event as processed
        await db.from('events').update({ status: 'processed' }).eq('id', evt.event_id);

        // Fire journey-engine
        fetch(`${SUPABASE_URL}/functions/v1/journey-engine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({ event_id: evt.event_id }),
        }).catch((err) => {
          console.error(`[checkout-scan] journey-engine trigger failed for event ${evt.event_id}:`, err.message);
        });

        triggered++;
      } catch (e: any) {
        console.error(`[checkout-scan] Error processing event ${evt.event_id}:`, e.message);
      }
    }

    console.log(`[checkout-scan] Triggered journey-engine for ${triggered}/${newEvents.length} events`);

    return new Response(JSON.stringify({
      scanned: true,
      synthesized: newEvents.length,
      triggered,
    }), { status: 200 });

  } catch (err: any) {
    console.error('[checkout-scan] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
