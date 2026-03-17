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
