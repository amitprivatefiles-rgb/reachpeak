import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: ' + (authError?.message || 'No user found') }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (profileFetchError) {
      return new Response(
        JSON.stringify({ error: 'Profile fetch error: ' + profileFetchError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required. Your role: ' + (profile?.role || 'none') }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { email, password, full_name, role } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields. Got: ' + JSON.stringify({ email: !!email, password: !!password, full_name: !!full_name, role: !!role }) }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: 'Auth error: ' + createError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (authData.user) {
      // Use upsert instead of insert because the handle_new_user trigger
      // (from migration 20260111122431) may have already created a profile row
      // when the auth.users entry was created above. Using upsert avoids
      // the duplicate key conflict.
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        email,
        full_name,
        role,
        is_active: true,
      }, { onConflict: 'id' });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ error: 'Profile creation error: ' + profileError.message + ' (Details: ' + JSON.stringify(profileError) + ')' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      await supabaseAdmin.from('lead_sources').insert([
        { user_id: authData.user.id, source_name: 'Excel', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'Facebook', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'Instagram', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'Website', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'WhatsApp', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'Manual', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
      ]);

      await supabaseAdmin.from('dashboard_metrics').insert({
        user_id: authData.user.id,
        metric_date: new Date().toISOString().split('T')[0],
        total_contacts: 0,
        total_numbers_uploaded: 0,
        total_messages_sent: 0,
        total_messages_failed: 0,
        messages_pending_retry: 0,
        active_campaigns: 0,
        completed_campaigns: 0,
        delivery_rate: 0,
        failure_rate: 0,
        blacklisted_numbers: 0,
        active_agents: 0,
      });

      const { error: logError } = await supabaseAdmin.from('activity_logs').insert({
        user_id: requestingUser.id,
        action: 'Created new user',
        entity_type: 'user',
        entity_id: authData.user.id,
        details: { email, role },
      });

      if (logError) {
        console.error('Failed to create activity log:', logError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: authData.user }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error: ' + (error.message || 'Unknown error') + ' (Stack: ' + error.stack + ')' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});