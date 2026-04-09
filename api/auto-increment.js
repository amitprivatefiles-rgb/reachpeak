import { createClient } from '@supabase/supabase-js';

/**
 * Vercel Cron Job — Server-side auto-increment engine
 *
 * Runs every 1 minute via Vercel Cron, independent of any browser session.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS and update ALL campaigns.
 *
 * This ensures campaigns complete on time even when no one is logged in.
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Verify this is a cron request (security)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also allow Vercel's internal cron calls
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent.includes('vercel-cron')) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const nowMs = now.getTime();

    // Fetch all running campaigns with auto-increment enabled
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'Running')
      .eq('auto_increment_enabled', true);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active campaigns', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const campaign of campaigns) {
      const totalTarget = campaign.auto_increment_total || 0;
      if (totalTarget <= 0) continue;

      const currentSent = campaign.messages_sent || 0;
      const currentFailed = campaign.messages_failed || 0;
      const totalProcessed = currentSent + currentFailed;

      const sentRatio = parseFloat(String(campaign.auto_increment_sent_ratio)) / 100;
      const failedRatio = parseFloat(String(campaign.auto_increment_failed_ratio)) / 100;
      const ratioSum = sentRatio + failedRatio || 1;

      const finalSent = Math.round(totalTarget * (sentRatio / ratioSum));
      const finalFailed = totalTarget - finalSent;

      // ===== COMPLETION CHECK =====
      const completeAt = campaign.auto_increment_complete_at
        ? new Date(campaign.auto_increment_complete_at)
        : null;

      const shouldComplete =
        totalProcessed >= totalTarget ||
        (completeAt && nowMs >= completeAt.getTime());

      if (shouldComplete) {
        const endTime = (completeAt && completeAt.getTime() <= nowMs)
          ? completeAt.toISOString()
          : now.toISOString();

        await supabase
          .from('campaigns')
          .update({
            status: 'Completed',
            auto_increment_enabled: false,
            messages_sent: finalSent,
            messages_failed: finalFailed,
            end_time: endTime,
            last_auto_increment: now.toISOString(),
          })
          .eq('id', campaign.id);

        await supabase.from('notifications').insert({
          user_id: campaign.user_id,
          title: 'Campaign Completed ✅',
          message: `Your campaign "${campaign.name}" has finished! ${finalSent.toLocaleString()} messages delivered out of ${totalTarget.toLocaleString()}.`,
          type: 'campaign_completed',
          campaign_id: campaign.id,
        });

        results.push({ id: campaign.id, name: campaign.name, action: 'completed', finalSent, finalFailed });
        continue;
      }

      // ===== ABSOLUTE TIME-BASED PACING =====
      if (completeAt) {
        const startTime = campaign.start_time
          ? new Date(campaign.start_time)
          : new Date(campaign.approved_at || campaign.created_at);

        const totalDurationMs = completeAt.getTime() - startTime.getTime();
        if (totalDurationMs <= 0) continue;

        const elapsedMs = nowMs - startTime.getTime();
        let elapsedFraction = Math.max(0, Math.min(1, elapsedMs / totalDurationMs));

        // Subtle jitter for natural pattern
        const jitter = (Math.random() - 0.5) * 0.02;
        elapsedFraction = Math.max(0, Math.min(1, elapsedFraction + jitter));

        const expectedTotal = Math.round(totalTarget * elapsedFraction);
        const expectedSent = Math.round(expectedTotal * (sentRatio / ratioSum));
        const expectedFailed = expectedTotal - expectedSent;

        const newSent = Math.min(Math.max(currentSent, expectedSent), finalSent);
        const newFailed = Math.min(Math.max(currentFailed, expectedFailed), finalFailed);

        if (newSent !== currentSent || newFailed !== currentFailed) {
          await supabase
            .from('campaigns')
            .update({
              messages_sent: newSent,
              messages_failed: newFailed,
              last_auto_increment: now.toISOString(),
            })
            .eq('id', campaign.id);

          results.push({
            id: campaign.id,
            name: campaign.name,
            action: 'incremented',
            sent: newSent,
            failed: newFailed,
            progress: `${((newSent + newFailed) / totalTarget * 100).toFixed(1)}%`,
          });
        }
      } else {
        // Legacy interval-based fallback
        const lastIncrement = campaign.last_auto_increment
          ? new Date(campaign.last_auto_increment)
          : new Date(0);
        const secondsSinceLastUpdate = (nowMs - lastIncrement.getTime()) / 1000;
        const interval = campaign.auto_increment_interval || 5;
        if (secondsSinceLastUpdate < interval) continue;

        const messagesRemaining = totalTarget - totalProcessed;
        if (messagesRemaining <= 0) continue;

        const ticksToProcess = Math.min(Math.floor(secondsSinceLastUpdate / interval), 50);
        const messagesToAdd = Math.min(Math.max(1, ticksToProcess), messagesRemaining);

        let newSent = currentSent;
        let newFailed = currentFailed;

        for (let i = 0; i < messagesToAdd; i++) {
          const totalAfter = newSent + newFailed + 1;
          if (totalAfter > totalTarget) break;
          const expectedSentAtTotal = Math.round(totalAfter * (sentRatio / ratioSum));
          if (expectedSentAtTotal > newSent) {
            newSent++;
          } else {
            newFailed++;
          }
        }

        if (newSent !== currentSent || newFailed !== currentFailed) {
          await supabase
            .from('campaigns')
            .update({
              messages_sent: newSent,
              messages_failed: newFailed,
              last_auto_increment: now.toISOString(),
            })
            .eq('id', campaign.id);

          results.push({ id: campaign.id, name: campaign.name, action: 'incremented-legacy', sent: newSent, failed: newFailed });
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Auto-increment processed',
        timestamp: now.toISOString(),
        campaignsChecked: campaigns.length,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
