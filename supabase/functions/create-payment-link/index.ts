// Supabase Edge Function: create-payment-link
// Dual auth: user JWT (inbox) or service-role (pipeline/journey-engine).
// Creates a Razorpay payment link via _shared/payments.ts.
//
// Deploy: supabase functions deploy create-payment-link --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createPaymentLink } from '../_shared/payments.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Auth required' }, 401);

    // Service-role client (always needed for Vault + payment_providers)
    const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let userId: string;

    // Determine auth mode
    if (token === SERVICE_ROLE) {
      // Internal call — user_id must be in body
      const body = await req.json();
      if (!body.user_id) return json({ error: 'user_id required for service calls' }, 400);
      userId = body.user_id;
      return await processRequest(db, userId, body);
    } else {
      // User JWT
      const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user }, error: authErr } = await anonClient.auth.getUser();
      if (authErr || !user) return json({ error: 'Unauthorized' }, 401);
      userId = user.id;
      const body = await req.json();
      return await processRequest(db, userId, body);
    }

  } catch (err: any) {
    console.error('[create-payment-link] Error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});

async function processRequest(db: any, userId: string, body: any) {
  const {
    order_id, contact_phone, amount, currency,
    description, discount, source, journey_execution_id,
  } = body;

  if (!contact_phone) return json({ error: 'contact_phone is required' }, 400);

  // Resolve amount from order if not provided
  let finalAmount = amount;
  let orderExternalId: string | undefined;

  if (order_id && !finalAmount) {
    const { data: order } = await db.from('orders')
      .select('total, external_order_id')
      .eq('id', order_id).eq('user_id', userId).maybeSingle();
    if (order) {
      finalAmount = Number(order.total);
      orderExternalId = order.external_order_id;
    }
  }

  if (!finalAmount || finalAmount <= 0) {
    return json({ error: 'amount is required and must be > 0' }, 400);
  }

  const result = await createPaymentLink(db, userId, {
    orderId: order_id,
    orderExternalId: orderExternalId || body.order_external_id,
    contactPhone: contact_phone,
    amount: finalAmount,
    currency,
    description,
    discount,
    source: source || 'api',
    journeyExecutionId: journey_execution_id,
  });

  if (!result.ok) {
    return json({ error: result.error }, result.error === 'no_payment_provider' ? 404 : 500);
  }

  return json({
    ok: true,
    pay_url: result.payUrl,
    payment_link_id: result.paymentLinkId,
    amount: result.amount,
    existing: result.existing || false,
  });
}
