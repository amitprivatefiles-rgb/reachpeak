// Supabase Edge Function: shopify-webhook
// Receives Shopify webhook events, verifies HMAC, maps to internal events,
// and processes via shared eventPipeline.
//
// Resolves tenant by X-Shopify-Shop-Domain header against integration_keys.
// HMAC verified over RAW body using provider_secret.
//
// Deploy: supabase functions deploy shopify-webhook --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { normalizePhone, runPipeline } from '../_shared/eventPipeline.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── HMAC-SHA256 verification ──
async function verifyHmac(rawBody: string, secret: string, expectedHmac: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === expectedHmac;
}

// ── Topic → internal event mapping ──

interface MappedEvent {
  eventType: string;
  dedupeKey: string;
  phone: string | null;
  contactName: string | null;
  payload: Record<string, any>;
}

function mapShopifyTopic(topic: string, body: any): MappedEvent | null {
  // Extract common fields
  const orderId = body.id?.toString() || body.order_id?.toString() || '';
  const orderNumber = body.order_number?.toString() || body.name || orderId;

  // Extract customer phone
  let rawPhone: string | null = null;
  let contactName: string | null = null;

  if (body.customer) {
    rawPhone = body.customer.phone || body.customer.default_address?.phone || null;
    contactName = [body.customer.first_name, body.customer.last_name].filter(Boolean).join(' ') || null;
  }
  if (!rawPhone && body.shipping_address?.phone) {
    rawPhone = body.shipping_address.phone;
  }
  if (!rawPhone && body.billing_address?.phone) {
    rawPhone = body.billing_address.phone;
  }
  if (!rawPhone && body.phone) {
    rawPhone = body.phone;
  }

  // Extract address
  const addr = body.shipping_address || body.billing_address || {};
  const pincode = addr.zip?.toString()?.replace(/\s/g, '') || null;

  // Extract items
  const items = (body.line_items || []).map((li: any) => ({
    title: li.title,
    quantity: li.quantity,
    price: li.price,
    sku: li.sku,
  }));

  // Detect COD
  const gateway = (body.gateway || body.payment_gateway_names?.[0] || '').toLowerCase();
  const isCod = /cod|cash/.test(gateway);

  // Common payload
  const basePayload: Record<string, any> = {
    order_id: orderNumber,
    shopify_order_id: orderId,
    total: body.total_price || body.subtotal_price,
    currency: body.currency || 'INR',
    payment_method: gateway || (body.financial_status === 'paid' ? 'prepaid' : null),
    cod: isCod,
    is_cod: isCod,
    items,
    address: {
      line: [addr.address1, addr.address2].filter(Boolean).join(', '),
      city: addr.city,
      state: addr.province,
      pincode,
    },
    address_line: [addr.address1, addr.address2].filter(Boolean).join(', '),
    address_city: addr.city,
    address_state: addr.province,
    address_pincode: pincode,
  };

  // Map by topic
  switch (topic) {
    case 'orders/create':
      return {
        eventType: 'order_created',
        dedupeKey: `order_created:${orderId}`,
        phone: rawPhone,
        contactName,
        payload: basePayload,
      };

    case 'orders/paid':
      return {
        eventType: 'order_paid',
        dedupeKey: `order_paid:${orderId}`,
        phone: rawPhone,
        contactName,
        payload: { order_id: orderNumber, payment_method: gateway || 'prepaid' },
      };

    case 'orders/cancelled':
      return {
        eventType: 'order_cancelled',
        dedupeKey: `order_cancelled:${orderId}`,
        phone: rawPhone,
        contactName,
        payload: { order_id: orderNumber, reason: body.cancel_reason || null },
      };

    case 'orders/fulfilled':
    case 'fulfillments/create': {
      const fulfillment = body.fulfillments?.[0] || body;
      return {
        eventType: 'order_shipped',
        dedupeKey: `order_shipped:${orderId}:${fulfillment.id || ''}`,
        phone: rawPhone,
        contactName,
        payload: {
          order_id: orderNumber,
          tracking_url: fulfillment.tracking_url || fulfillment.tracking_urls?.[0] || null,
          carrier: fulfillment.tracking_company || null,
          tracking_number: fulfillment.tracking_number || null,
        },
      };
    }

    case 'fulfillments/update': {
      // Check shipment_status for delivered/failure
      const shipmentStatus = (body.shipment_status || '').toLowerCase();
      if (shipmentStatus === 'delivered') {
        return {
          eventType: 'order_delivered',
          dedupeKey: `order_delivered:${body.order_id || orderId}`,
          phone: rawPhone,
          contactName,
          payload: { order_id: orderNumber },
        };
      }
      if (['failure', 'attempted_delivery'].includes(shipmentStatus)) {
        // Note: Shopify doesn't have explicit RTO — we log the delivery attempt
        // Store can send order_rto manually or via integration if courier confirms RTO
        return {
          eventType: 'order_shipped', // update, not a new status
          dedupeKey: `fulfillment_update:${body.id || orderId}:${shipmentStatus}`,
          phone: rawPhone,
          contactName,
          payload: { order_id: orderNumber, shipment_status: shipmentStatus, note: 'Delivery attempt failed' },
        };
      }
      return null; // ignore other fulfillment updates
    }

    case 'refunds/create':
      return {
        eventType: 'order_refunded',
        dedupeKey: `order_refunded:${body.order_id || orderId}:${body.id || ''}`,
        phone: rawPhone,
        contactName,
        payload: {
          order_id: orderNumber,
          amount: body.transactions?.[0]?.amount || null,
        },
      };

    case 'checkouts/create':
    case 'checkouts/update':
      return {
        eventType: 'checkout_started',
        dedupeKey: `checkout:${body.token || body.id || orderId}`,
        phone: rawPhone,
        contactName,
        payload: {
          checkout_token: body.token || body.id,
          cart_total: body.total_price || body.subtotal_price,
          currency: body.currency || 'INR',
          checkout_url: body.abandoned_checkout_url || body.recovery_url || null,
          items,
        },
      };

    default:
      return null;
  }
}

// ── Main Handler ──

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // Read RAW body BEFORE parsing (HMAC must verify raw)
    const rawBody = await req.text();

    // Extract headers
    const shopDomain = req.headers.get('X-Shopify-Shop-Domain') ?? '';
    const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256') ?? '';
    const topic = req.headers.get('X-Shopify-Topic') ?? '';

    if (!shopDomain) {
      return new Response(JSON.stringify({ error: 'Missing X-Shopify-Shop-Domain' }), { status: 400 });
    }

    // Resolve tenant by shop_domain
    const { data: integration, error: intErr } = await db
      .from('integration_keys')
      .select('id, user_id, source, callback_url, callback_secret, provider_secret')
      .eq('shop_domain', shopDomain)
      .eq('source', 'shopify')
      .eq('is_active', true)
      .maybeSingle();

    if (intErr || !integration) {
      return new Response(JSON.stringify({ error: 'Unknown shop domain' }), { status: 401 });
    }

    // Verify HMAC
    if (!integration.provider_secret) {
      console.error('[shopify-webhook] No provider_secret configured for shop:', shopDomain);
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { status: 401 });
    }

    const hmacValid = await verifyHmac(rawBody, integration.provider_secret, hmacHeader);
    if (!hmacValid) {
      console.error('[shopify-webhook] HMAC verification failed for shop:', shopDomain);
      return new Response(JSON.stringify({ error: 'HMAC verification failed' }), { status: 401 });
    }

    // Parse body
    const body = JSON.parse(rawBody);

    // Map topic to internal event
    const mapped = mapShopifyTopic(topic, body);
    if (!mapped) {
      // Unhandled topic — acknowledge to prevent Shopify retries
      return new Response(JSON.stringify({ ok: true, ignored: true, topic }), { status: 200 });
    }

    // Normalize phone
    const phone = normalizePhone(mapped.phone);

    // Run shared pipeline
    const result = await runPipeline(db, SUPABASE_URL, SERVICE_ROLE, {
      userId: integration.user_id,
      source: 'shopify',
      eventType: mapped.eventType,
      dedupeKey: mapped.dedupeKey,
      phone,
      contactName: mapped.contactName,
      payload: mapped.payload,
    });

    console.log(`[shopify-webhook] shop=${shopDomain} topic=${topic} event=${mapped.eventType} result=${JSON.stringify(result)}`);
    return new Response(JSON.stringify({ ok: true, ...result }), { status: 200 });

  } catch (err: any) {
    console.error('[shopify-webhook] Error:', err);
    // Always return 200 to Shopify to prevent retries on our errors
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
});
