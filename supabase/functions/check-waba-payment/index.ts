// Supabase Edge Function: check-waba-payment
// Option A live status: reads the caller's connected WABA/number straight from
// Meta Graph so the onboarding UI can show real-time state and re-check on demand.
// Returns a structured status the frontend turns into a checklist.
//
// Deploy: supabase functions deploy check-waba-payment --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const GRAPH = `https://graph.facebook.com/${Deno.env.get('META_GRAPH_VERSION') ?? 'v25.0'}`;
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

    // 1. Load the caller's active WABA (never the system sender).
    const { data: acct } = await db.from('whatsapp_accounts')
      .select('id, waba_id, phone_number_id, display_phone_number, verified_name, status')
      .eq('user_id', user.id).eq('is_active', true).eq('is_system', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (!acct) {
      return json({ ok: true, connected: false, steps: {
        connected: false, registered: false, reviewed: false, ready: false,
      }, guidance: 'Connect your WhatsApp Business number to begin.' });
    }

    // 2. Decrypt the WABA token to query Meta.
    const { data: waToken } = await db.rpc('get_waba_access_token', { p_account_id: acct.id });

    let numberStatus: any = null, review: any = null;
    if (waToken) {
      // Phone number live fields.
      const nRes = await fetch(
        `${GRAPH}/${acct.phone_number_id}?fields=display_phone_number,verified_name,code_verification_status,name_status,quality_rating,platform_type,throughput,messaging_limit_tier`,
        { headers: { Authorization: `Bearer ${waToken}` } });
      numberStatus = await nRes.json().catch(() => ({}));
      // WABA review status.
      const wRes = await fetch(
        `${GRAPH}/${acct.waba_id}?fields=account_review_status,name,timezone_id`,
        { headers: { Authorization: `Bearer ${waToken}` } });
      review = await wRes.json().catch(() => ({}));
    }

    const registered = numberStatus?.code_verification_status === 'VERIFIED' || acct.status === 'connected';
    const reviewApproved = (review?.account_review_status ?? '').toUpperCase() === 'APPROVED';
    const tier = numberStatus?.messaging_limit_tier ?? acct?.messaging_limit_tier ?? null;
    // On the free tier a number can send business-initiated messages with no card.
    const ready = !!(registered && (reviewApproved || tier || numberStatus?.display_phone_number));

    // Keep our local mirror fresh.
    if (numberStatus?.quality_rating || tier) {
      await db.from('whatsapp_accounts').update({
        quality_rating: numberStatus?.quality_rating ?? undefined,
        messaging_limit_tier: tier ?? undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', acct.id);
    }

    return json({
      ok: true,
      connected: true,
      account: {
        phone: acct.display_phone_number ?? numberStatus?.display_phone_number ?? null,
        name: acct.verified_name ?? numberStatus?.verified_name ?? null,
        quality: numberStatus?.quality_rating ?? null,
        tier,
        review_status: review?.account_review_status ?? null,
      },
      steps: { connected: true, registered, reviewed: reviewApproved, ready },
      free_tier: true,
      guidance: ready
        ? 'Your number is connected and can send. Meta gives you 1,000 free conversations every month. To send beyond that, add a payment method in WhatsApp Manager → Billing & payments.'
        : 'Your number is connected. Finish verification in WhatsApp Manager, then re-check. Add a payment method (WhatsApp Manager → Billing & payments) to send beyond the free 1,000 conversations/month.',
    });
  } catch (err: any) {
    console.error('[check-waba-payment] error', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
