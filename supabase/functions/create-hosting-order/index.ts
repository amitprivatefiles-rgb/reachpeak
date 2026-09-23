import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPlatformProvider } from '../_shared/platformPay.ts';

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

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Plan catalogue (rupees, BEFORE GST)
const PLANS: Record<string, { amount: number; label: string; months: number }> = {
  monthly:  { amount: 799,   label: 'Monthly',   months: 1 },
  yearly:   { amount: 6999,  label: 'Yearly',    months: 12 },
  '48months': { amount: 11000, label: '48 Months', months: 48 },
};

const GST_RATE = 0.18;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Action 2: Activate (post-payment Gmail submission)
    if (body.action === 'activate') {
      const gmail = (body.gmail ?? '').toString().trim();
      const paymentId = (body.payment_id ?? body.rzp_payment_id ?? '').toString().trim();
      const orderId = (body.order_id ?? body.rzp_order_id ?? '').toString().trim();

      if (!gmail) {
        return json({ error: 'Gmail is required' }, 400);
      }

      let targetOrderId = orderId;
      if (!targetOrderId && paymentId.startsWith('order_')) {
        targetOrderId = paymentId;
      }

      // If only payment_id was passed (e.g. pay_xxx), attempt resolving order_id from Razorpay API
      if (!targetOrderId && paymentId && paymentId.startsWith('pay_')) {
        try {
          const prov = await getPlatformProvider(db, 'razorpay');
          if (prov) {
            const basicAuth = btoa(`${prov.key_id}:${prov.key_secret}`);
            const rzpResp = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
              headers: { 'Authorization': `Basic ${basicAuth}` },
            });
            if (rzpResp.ok) {
              const pData = await rzpResp.json();
              if (pData?.order_id) {
                targetOrderId = pData.order_id;
              }
            }
          }
        } catch (fetchErr: any) {
          console.warn('[create-hosting-order] Razorpay payment lookup skipped:', fetchErr?.message);
        }
      }

      try {
        let query = db.from('hosting_orders').update({
          gmail,
          rzp_payment_id: paymentId || null,
          status: 'paid',
        });

        if (targetOrderId) {
          query = query.eq('rzp_order_id', targetOrderId);
        } else if (paymentId) {
          query = query.or(`rzp_order_id.eq.${paymentId},rzp_payment_id.eq.${paymentId}`);
        } else {
          return json({ error: 'Order ID or Payment ID is required' }, 400);
        }

        const { error: updateErr } = await query;
        if (updateErr) {
          console.warn('[create-hosting-order] hosting_orders update error:', updateErr.message);
        }
      } catch (e: any) {
        console.warn('hosting_orders update skipped:', e?.message || e);
      }

      return json({ ok: true });
    }

    // Action 1: Create Order (default)
    const planKey = (body.plan ?? 'monthly').toString();
    const plan = PLANS[planKey];
    if (!plan) {
      return json({ error: 'Invalid plan' }, 400);
    }

    const billing = (body.billing && typeof body.billing === 'object') ? body.billing : {};
    const amountWithGst = Math.round(plan.amount * (1 + GST_RATE));

    const prov = await getPlatformProvider(db, 'razorpay');
    if (!prov) {
      return json({ error: 'Payments not configured yet. Please contact support.', code: 'no_gateway' }, 503);
    }

    const receipt = 'host_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const basicAuth = btoa(`${prov.key_id}:${prov.key_secret}`);

    const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountWithGst * 100,
        currency: 'INR',
        receipt,
        payment_capture: 1,
        notes: {
          kind: 'hosting',
          plan: planKey,
          email: billing.email || '',
          receipt,
        },
      }),
    });

    if (!rzpResp.ok) {
      const errText = await rzpResp.text();
      console.error('[create-hosting-order] Razorpay error', rzpResp.status, errText);
      return json({ error: `Payment gateway error (${rzpResp.status})`, code: 'gateway_error' }, 502);
    }

    const order = await rzpResp.json();

    try {
      const { error: insertErr } = await db.from('hosting_orders').insert({
        receipt,
        rzp_order_id: order.id,
        plan: planKey,
        months: plan.months,
        base_amount: plan.amount,
        gst_amount: amountWithGst - plan.amount,
        total_amount: amountWithGst,
        billing_name: billing.name,
        billing_email: billing.email,
        billing_phone: billing.phone,
        billing_company: billing.company || null,
        billing_gstin: billing.gstin || null,
        billing_address: billing.address,
        billing_state: billing.state,
        billing_pincode: billing.pincode,
        status: 'pending',
      });
      if (insertErr) {
        console.warn('hosting_orders insert skipped:', insertErr.message);
      }
    } catch (e: any) {
      console.warn('hosting_orders insert skipped:', e?.message || e);
    }

    return json({
      ok: true,
      key_id: prov.key_id,
      order_id: order.id,
      amount_paise: amountWithGst * 100,
      currency: 'INR',
      plan: planKey,
      plan_label: plan.label,
      base_amount: plan.amount,
      gst_amount: amountWithGst - plan.amount,
      total_amount: amountWithGst,
    });
  } catch (err: any) {
    console.error('[create-hosting-order] error:', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
