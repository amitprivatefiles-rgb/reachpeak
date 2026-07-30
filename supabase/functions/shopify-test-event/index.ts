// Supabase Edge Function: shopify-test-event
// JWT-authenticated. Sends a simulated Shopify orders/create webhook
// through the REAL shopify-webhook endpoint to verify the full pipeline.
//
// Signs the payload with the tenant's REAL Vault-stored secret,
// proving HMAC verification, tenant resolution, event storage, and
// pipeline invocation all work.
//
// Deploy: supabase functions deploy shopify-test-event

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authorization required' }, 401);
    const { data: { user }, error: authErr } =
      await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    // 2. Parse input
    const { integration_key_id } = await req.json();
    if (!integration_key_id) return json({ error: 'integration_key_id required' }, 400);

    // 3. Load integration key
    const { data: intKey, error: keyErr } = await supabase
      .from('integration_keys')
      .select('id, user_id, shop_domain, source')
      .eq('id', integration_key_id)
      .eq('user_id', user.id)
      .eq('source', 'shopify')
      .single();

    if (keyErr || !intKey) return json({ error: 'Integration key not found' }, 404);

    // 4. Get the signing secret from Vault
    const { data: secret, error: secretErr } = await supabase.rpc('get_provider_secret', {
      p_key_id: intKey.id,
    });
    if (secretErr || !secret) {
      return json({ error: 'Signing secret not found in Vault' }, 500);
    }

    const trace: { step: string; status: 'pass' | 'fail' | 'skip'; detail?: string }[] = [];

    // 5. Build a realistic test order payload
    const testOrderId = 9999000000 + Math.floor(Math.random() * 999999);
    const testDedupeKey = `order_created:${testOrderId}`;
    const testPhone = '+919999900000'; // test phone
    const testPayload = JSON.stringify({
      id: testOrderId,
      order_number: `#TEST-${testOrderId}`,
      name: `#TEST-${testOrderId}`,
      total_price: '599.00',
      subtotal_price: '599.00',
      currency: 'INR',
      financial_status: 'paid',
      gateway: 'manual',
      payment_gateway_names: ['manual'],
      customer: {
        id: 9999999,
        first_name: 'Test',
        last_name: 'Customer',
        phone: testPhone,
        default_address: { phone: testPhone },
      },
      shipping_address: {
        address1: '123 Test Street',
        city: 'Mumbai',
        province: 'Maharashtra',
        zip: '400001',
        phone: testPhone,
      },
      billing_address: {
        address1: '123 Test Street',
        city: 'Mumbai',
        province: 'Maharashtra',
        zip: '400001',
        phone: testPhone,
      },
      line_items: [{
        title: 'Test Product',
        quantity: 1,
        price: '599.00',
        sku: 'TEST-SKU-001',
      }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      test: true,
      tags: 'reachpeak-test',
    });

    // 6. HMAC-sign the payload with the REAL secret
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(testPayload));
    const hmacBase64 = btoa(String.fromCharCode(...new Uint8Array(sig)));

    trace.push({ step: 'HMAC Signing', status: 'pass', detail: 'Payload signed with real Vault secret' });

    // 7. POST to the real shopify-webhook endpoint
    const webhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook`;
    let webhookResponse: Response;
    try {
      webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Shop-Domain': intKey.shop_domain,
          'X-Shopify-Hmac-Sha256': hmacBase64,
          'X-Shopify-Topic': 'orders/create',
        },
        body: testPayload,
      });
    } catch (fetchErr: any) {
      trace.push({ step: 'Webhook Call', status: 'fail', detail: `Network error: ${fetchErr.message}` });
      return json({ success: false, trace });
    }

    const webhookBody = await webhookResponse.json().catch(() => ({}));

    // 8. Check webhook response
    if (webhookResponse.status === 401) {
      trace.push({ step: 'Signature Verification', status: 'fail', detail: webhookBody.error || 'HMAC rejected' });
      return json({ success: false, trace });
    }
    trace.push({ step: 'Signature Verification', status: 'pass', detail: 'HMAC accepted by webhook' });

    if (webhookResponse.status !== 200) {
      trace.push({ step: 'Tenant Resolution', status: 'fail', detail: webhookBody.error || `HTTP ${webhookResponse.status}` });
      return json({ success: false, trace });
    }
    trace.push({ step: 'Tenant Resolution', status: 'pass', detail: `Resolved shop: ${intKey.shop_domain}` });

    // 9. Give pipeline a moment to process, then verify DB state
    await new Promise(r => setTimeout(r, 2000));

    // Check event stored
    const { data: testEvent } = await supabase
      .from('events')
      .select('id, event_type, status')
      .eq('user_id', user.id)
      .eq('source', 'shopify')
      .eq('dedupe_key', testDedupeKey)
      .maybeSingle();

    if (testEvent) {
      trace.push({ step: 'Event Stored', status: 'pass', detail: `Event ${testEvent.id} (${testEvent.event_type}, ${testEvent.status})` });
    } else {
      trace.push({ step: 'Event Stored', status: 'fail', detail: 'No event found with expected dedupe_key' });
    }

    // Check contact upserted
    const normalizedPhone = testPhone.replace(/[^0-9]/g, '');
    const { data: testContact } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('user_id', user.id)
      .or(`phone_number.eq.${normalizedPhone},phone_number.eq.${testPhone}`)
      .maybeSingle();

    if (testContact) {
      trace.push({ step: 'Contact Upserted', status: 'pass', detail: `Contact: ${testContact.name || testContact.id}` });
    } else {
      trace.push({ step: 'Contact Upserted', status: 'fail', detail: 'No contact found for test phone' });
    }

    // Check journeys evaluated (check if any journey_execution was created for this event)
    if (testEvent) {
      const { data: executions } = await supabase
        .from('journey_executions')
        .select('id, journey_id, status')
        .eq('event_id', testEvent.id)
        .limit(5);

      if (executions && executions.length > 0) {
        trace.push({ step: 'Journeys Evaluated', status: 'pass', detail: `${executions.length} journey(s) triggered` });
      } else {
        trace.push({ step: 'Journeys Evaluated', status: 'pass', detail: 'No matching journeys (this is OK if none are configured yet)' });
      }
    } else {
      trace.push({ step: 'Journeys Evaluated', status: 'skip', detail: 'Skipped (event not stored)' });
    }

    // Mark the test event so it can be identified/cleaned up
    if (testEvent) {
      await supabase.from('events').update({
        status: 'test',
      }).eq('id', testEvent.id);
    }

    // Update connection status based on results
    const allPassed = trace.every(t => t.status !== 'fail');
    await supabase.from('integration_keys').update({
      connection_status: allPassed ? 'healthy' : 'error',
      last_event_at: allPassed ? new Date().toISOString() : undefined,
    }).eq('id', intKey.id);

    return json({
      success: allPassed,
      trace,
    });
  } catch (e) {
    return json({ error: 'Internal error: ' + ((e as Error).message || 'unknown') }, 500);
  }
});
