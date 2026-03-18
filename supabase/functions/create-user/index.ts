import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'ReachPeak <noreply@reachpeak.in>';

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

    const {
      email,
      password,
      full_name,
      role,
      business_name,
      business_type,
      whatsapp_number,
      contact_person,
      plan_type,
    } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, full_name, and role are required.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create auth user with email pre-confirmed (no confirmation email needed)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
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
      // Upsert profile (trigger may have already created one)
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
          JSON.stringify({ error: 'Profile creation error: ' + profileError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create an active subscription if business details are provided
      if (business_name && plan_type) {
        const now = new Date();
        const expiresAt = new Date(now);
        if (plan_type === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        const amount = plan_type === 'yearly' ? 9999 : 999;

        const { error: subError } = await supabaseAdmin.from('subscriptions').insert({
          user_id: authData.user.id,
          plan_type: plan_type || 'monthly',
          amount,
          payment_reference: 'ADMIN_CREATED_' + Date.now(),
          status: 'active',
          business_name: business_name || '',
          business_type: business_type || 'Other',
          whatsapp_number: whatsapp_number || '',
          contact_person: contact_person || full_name,
          approved_by: requestingUser.id,
          approved_at: now.toISOString(),
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

        if (subError) {
          console.error('Subscription creation error:', subError);
          // Don't fail the whole request — user + profile are already created
        }
      }

      // Seed default lead sources
      await supabaseAdmin.from('lead_sources').insert([
        { user_id: authData.user.id, source_name: 'Excel', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'Facebook', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'Instagram', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'Website', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'WhatsApp', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
        { user_id: authData.user.id, source_name: 'Manual', total_numbers: 0, messages_sent: 0, messages_failed: 0, converted_leads: 0 },
      ]);

      // Seed default dashboard metrics
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

      // Log activity
      await supabaseAdmin.from('activity_logs').insert({
        user_id: requestingUser.id,
        action: 'Created new user',
        entity_type: 'user',
        entity_id: authData.user.id,
        details: { email, role, business_name: business_name || null },
      });

      // Send welcome email via Resend
      if (RESEND_API_KEY) {
        try {
          const planLabel = plan_type ? (plan_type.charAt(0).toUpperCase() + plan_type.slice(1)) : 'N/A';
          const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#10b981;font-size:24px;margin:0;">ReachPeak</h1>
      <p style="color:#64748b;font-size:13px;margin:4px 0 0;">WhatsApp Marketing Platform</p>
    </div>
    <div style="background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
      <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">Welcome to ReachPeak! 🎉</h2>
      <div style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hi <strong>${full_name}</strong>,<br><br>
        Your account has been created and is ready to use! Here are your login details:<br><br>
        <div style="background:#0f172a;padding:16px;border-radius:8px;margin:12px 0;">
          <strong style="color:#10b981;">📧 Email:</strong> <span style="color:#e2e8f0;">${email}</span><br>
          <strong style="color:#10b981;">🔑 Password:</strong> <span style="color:#e2e8f0;">Use the password provided by your admin</span><br>
          ${business_name ? `<strong style="color:#10b981;">🏢 Business:</strong> <span style="color:#e2e8f0;">${business_name}</span><br>` : ''}
          ${plan_type ? `<strong style="color:#10b981;">📋 Plan:</strong> <span style="color:#e2e8f0;">${planLabel} Plan</span><br>` : ''}
        </div><br>
        You now have full access to:<br>
        ✅ WhatsApp campaign management<br>
        ✅ Contact management with tags<br>
        ✅ Message templates with interactive buttons<br>
        ✅ Real-time delivery tracking<br>
        ✅ Detailed analytics & reports
      </div>
      <a href="https://reachpeakapi.in/login" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Login to Dashboard</a>
      <p style="color:#64748b;font-size:12px;margin:20px 0 0;border-top:1px solid #334155;padding-top:16px;">Need help? Contact us at support@reachpeak.in</p>
    </div>
    <p style="text-align:center;color:#475569;font-size:11px;margin:24px 0 0;">
      © ${new Date().getFullYear()} ReachPeak · WhatsApp Marketing Platform<br>
      <a href="https://reachpeakapi.in" style="color:#10b981;text-decoration:none;">reachpeak.in</a>
    </p>
  </div>
</body>
</html>`;

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [email],
              subject: `Welcome to ReachPeak, ${full_name}! 🎉`,
              html: emailHtml,
            }),
          });
        } catch (emailErr) {
          console.error('Welcome email failed:', emailErr);
          // Don't fail the request if email fails
        }
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
      JSON.stringify({ error: 'Internal error: ' + (error.message || 'Unknown error') }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});