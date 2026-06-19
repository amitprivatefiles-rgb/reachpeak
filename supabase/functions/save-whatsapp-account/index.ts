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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller's JWT using anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
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

    // Use service role client for the write (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert: one account per tenant for Phase 1
    const { data, error } = await serviceClient
      .from('whatsapp_accounts')
      .upsert(
        {
          user_id: user.id,
          waba_id,
          phone_number_id,
          access_token,
          display_phone_number,
          verified_name: verified_name || null,
          status: 'connected',
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('id, display_phone_number, verified_name, quality_rating, status, is_active')
      .single();

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

    // Return ONLY non-secret columns — never access_token
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
