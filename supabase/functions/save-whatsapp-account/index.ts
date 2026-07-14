import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate caller via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role to verify user's JWT (works without ANON_KEY)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { waba_id, phone_number_id, access_token, display_phone_number, verified_name } = await req.json();

    if (!waba_id || !phone_number_id || !access_token || !display_phone_number) {
      return new Response(JSON.stringify({ error: 'Missing required fields: waba_id, phone_number_id, access_token, display_phone_number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already has an account — update it, otherwise insert
    const { data: existing } = await serviceClient
      .from('whatsapp_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let data, error;

    if (existing) {
      // Update existing account
      ({ data, error } = await serviceClient
        .from('whatsapp_accounts')
        .update({
          waba_id,
          phone_number_id,
          access_token: '***VAULT***',
          display_phone_number,
          verified_name: verified_name || null,
          status: 'connected',
          is_active: true,
        })
        .eq('id', existing.id)
        .select('id, display_phone_number, verified_name, quality_rating, status, is_active')
        .single());
    } else {
      // Insert new account
      ({ data, error } = await serviceClient
        .from('whatsapp_accounts')
        .insert({
          user_id: user.id,
          waba_id,
          phone_number_id,
          access_token: '***VAULT***',
          display_phone_number,
          verified_name: verified_name || null,
          status: 'connected',
          is_active: true,
        })
        .select('id, display_phone_number, verified_name, quality_rating, status, is_active')
        .single());
    }

    if (error) {
      // If unique conflict on phone_number_id (another tenant owns it)
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'This phone number is already connected to another account' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    // Store token in vault
    if (data?.id) {
      await serviceClient.rpc('set_waba_access_token', { p_account_id: data.id, p_token: access_token });
    }

    // Return ONLY non-secret columns — never access_token
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
