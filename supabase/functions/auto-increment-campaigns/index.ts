import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    const { data: campaigns, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'Running')
      .eq('auto_increment_enabled', true);

    if (fetchError) {
      throw fetchError;
    }

    const updates = [];
    const today = now.toISOString().split('T')[0];

    for (const campaign of campaigns || []) {
      const totalProcessed = campaign.messages_sent + campaign.messages_failed;
      const targetTotal = campaign.auto_increment_total || 0;

      const shouldComplete =
        (campaign.auto_increment_complete_at && now >= new Date(campaign.auto_increment_complete_at)) ||
        (totalProcessed >= targetTotal);

      if (shouldComplete) {
        const sentRatio = parseFloat(campaign.auto_increment_sent_ratio) / 100;
        const failedRatio = parseFloat(campaign.auto_increment_failed_ratio) / 100;

        const finalSent = Math.round(targetTotal * sentRatio);
        const finalFailed = targetTotal - finalSent;

        await supabase
          .from('campaigns')
          .update({
            status: 'Completed',
            auto_increment_enabled: false,
            messages_sent: finalSent,
            messages_failed: finalFailed,
          })
          .eq('id', campaign.id);

        const { data: metricsData } = await supabase
          .from('dashboard_metrics')
          .select('*')
          .eq('user_id', campaign.user_id)
          .eq('metric_date', today)
          .maybeSingle();

        if (metricsData) {
          const sentDelta = finalSent - campaign.messages_sent;
          const failedDelta = finalFailed - campaign.messages_failed;

          await supabase
            .from('dashboard_metrics')
            .update({
              total_messages_sent: metricsData.total_messages_sent + sentDelta,
              total_messages_failed: metricsData.total_messages_failed + failedDelta,
            })
            .eq('user_id', campaign.user_id)
            .eq('metric_date', today);
        }

        // Send completion notification (in-app)
        await supabase.from('notifications').insert({
          user_id: campaign.user_id,
          title: 'Campaign Completed ✅',
          message: `Your campaign "${campaign.name}" has finished! ${finalSent.toLocaleString()} messages delivered out of ${targetTotal.toLocaleString()}.`,
          type: 'campaign_completed',
          campaign_id: campaign.id,
        });

        // Send completion email via Resend
        const deliveryRate = targetTotal > 0 ? ((finalSent / targetTotal) * 100).toFixed(1) : '0';
        try {
          await supabase.rpc('send_email_via_resend', {
            recipient: campaign.profiles?.email || '',
            email_subject: `✅ Campaign "${campaign.name}" Completed`,
            email_html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#10b981;font-size:24px;margin:0;">ReachPeak</h1>
<p style="color:#64748b;font-size:13px;">WhatsApp Marketing Platform</p>
</div>
<div style="background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
<h2 style="color:#fff;font-size:20px;margin:0 0 16px;">Campaign Completed! ✅</h2>
<p style="color:#94a3b8;font-size:13px;padding:8px 12px;background:#0f172a;border-radius:8px;border-left:3px solid #10b981;">Campaign: <strong style="color:#e2e8f0;">${campaign.name}</strong></p>
<div style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:16px 0 24px;">
Your campaign has finished delivering messages.<br><br>
<strong>Messages Sent:</strong> ${finalSent.toLocaleString()}<br>
<strong>Total Contacts:</strong> ${targetTotal.toLocaleString()}<br>
<strong>Delivery Rate:</strong> ${deliveryRate}%
</div>
<a href="https://reachpeakapi.in/campaigns" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">View Full Report</a>
</div>
</div></body></html>`,
          });
        } catch (e) {
          // Email send failure shouldn't break the function
          console.warn('Completion email failed:', e);
        }

        updates.push({ id: campaign.id, status: 'completed', messages_sent: finalSent, messages_failed: finalFailed });
        continue;
      }

      const lastIncrement = campaign.last_auto_increment
        ? new Date(campaign.last_auto_increment)
        : new Date(0);

      const secondsSinceLastIncrement = (now.getTime() - lastIncrement.getTime()) / 1000;
      const interval = campaign.auto_increment_interval || 5;

      if (secondsSinceLastIncrement >= interval) {
        const sentRatio = parseFloat(campaign.auto_increment_sent_ratio) / 100;
        const failedRatio = parseFloat(campaign.auto_increment_failed_ratio) / 100;

        const shouldFail = Math.random() < (failedRatio / (sentRatio + failedRatio));

        const finalSent = shouldFail ? campaign.messages_sent : campaign.messages_sent + 1;
        const finalFailed = shouldFail ? campaign.messages_failed + 1 : campaign.messages_failed;

        await supabase
          .from('campaigns')
          .update({
            messages_sent: finalSent,
            messages_failed: finalFailed,
            last_auto_increment: now.toISOString(),
          })
          .eq('id', campaign.id);

        const { data: metricsData } = await supabase
          .from('dashboard_metrics')
          .select('*')
          .eq('user_id', campaign.user_id)
          .eq('metric_date', today)
          .maybeSingle();

        if (metricsData) {
          await supabase
            .from('dashboard_metrics')
            .update({
              total_messages_sent: metricsData.total_messages_sent + (finalSent - campaign.messages_sent),
              total_messages_failed: metricsData.total_messages_failed + (finalFailed - campaign.messages_failed),
            })
            .eq('user_id', campaign.user_id)
            .eq('metric_date', today);
        }

        updates.push({
          id: campaign.id,
          messages_sent: finalSent,
          messages_failed: finalFailed
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length,
        campaigns: updates
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
