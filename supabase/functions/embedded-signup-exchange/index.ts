// Supabase Edge Function: embedded-signup-exchange
// Handles the WhatsApp Embedded Signup token exchange flow.
// 1. Authenticates the caller (Supabase user from JWT)
// 2. Exchanges the auth code for a Business Integration System User token
// 3. Subscribes the app to the WABA (webhooks)
// 4. Registers the phone number for Cloud API
// 5. Reads display info (number, verified name, quality)
// 6. Upserts into whatsapp_accounts
//
// Deploy WITH JWT verification (this is a logged-in user action):
//   supabase functions deploy embedded-signup-exchange

import { createClient } from 'npm:@supabase/supabase-js@2';

const GRAPH = `https://graph.facebook.com/${Deno.env.get('META_GRAPH_VERSION') ?? 'v23.0'}`;
const APP_ID = Deno.env.get('META_APP_ID')!;
const APP_SECRET = Deno.env.get('META_APP_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // 1. Authenticate the caller via their Supabase JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);

  // Parse the request body
  let payload: {
    code?: string;
    waba_id?: string;
    phone_number_id?: string;
    business_id?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const { code, waba_id, phone_number_id, business_id } = payload;
  if (!code || !waba_id || !phone_number_id) {
    return json({ error: 'missing_fields', detail: 'code, waba_id, and phone_number_id are required' }, 400);
  }

  // 2. Exchange code → Business Integration System User token
  //    (no redirect_uri needed for Embedded Signup)
  const tokenRes = await fetch(
    `${GRAPH}/oauth/access_token?client_id=${APP_ID}` +
    `&client_secret=${APP_SECRET}&code=${encodeURIComponent(code)}`,
  );
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    console.error('[embedded-signup] Token exchange failed:', tokenJson);
    return json({ error: 'token_exchange_failed', detail: tokenJson }, 400);
  }
  const accessToken: string = tokenJson.access_token;

  // 3. Subscribe the Reach Peak app to the WABA (webhooks)
  const subRes = await fetch(`${GRAPH}/${waba_id}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const subJson = await subRes.json().catch(() => ({}));
  if (!subRes.ok) {
    console.warn('[embedded-signup] subscribed_apps warning:', subJson);
    // Non-fatal — may already be subscribed
  }

  // 4. Register the phone number for Cloud API
  //    "already registered" (subcode 2388004) is treated as success
  const REGISTER_PIN = '000000';
  const regRes = await fetch(`${GRAPH}/${phone_number_id}/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', pin: REGISTER_PIN }),
  });
  const regJson = await regRes.json().catch(() => ({}));
  const alreadyRegistered =
    regJson?.error?.error_subcode === 2388004 ||
    /already/i.test(regJson?.error?.message ?? '');
  if (!regRes.ok && !alreadyRegistered) {
    console.error('[embedded-signup] Register failed (non-fatal):', regJson);
  }

  // 5. Read display info (number, verified name, quality)
  const infoRes = await fetch(
    `${GRAPH}/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const info = await infoRes.json().catch(() => ({}));

  // 6. Upsert into whatsapp_accounts using SERVICE ROLE (bypasses RLS),
  //    but pin user_id to the authenticated caller
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: acct, error: upErr } = await admin
    .from('whatsapp_accounts')
    .upsert(
      {
        user_id: user.id,
        waba_id,
        phone_number_id,
        access_token: accessToken,
        business_id: business_id ?? null,
        display_phone_number: info?.display_phone_number ?? null,
        verified_name: info?.verified_name ?? null,
        quality_rating: info?.quality_rating ?? null,
        status: 'connected',
        is_active: true,
        onboarded_via: 'embedded_signup',
        last_registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone_number_id' },
    )
    .select('id, waba_id, phone_number_id, display_phone_number, verified_name, status')
    .single();

  if (upErr) {
    console.error('[embedded-signup] DB upsert failed:', upErr);
    return json({ error: 'db_upsert_failed', detail: upErr.message }, 500);
  }

  console.log(`[embedded-signup] Connected ${acct?.display_phone_number} for user ${user.id}`);
  return json({
    ok: true,
    account: acct,
    registered: regRes.ok || alreadyRegistered,
    subscribed: subRes.ok,
  });
});
