import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Client-side auto-increment engine for campaign message counters.
 *
 * When a campaign has status='Running' and auto_increment_enabled=true,
 * this hook periodically increments messages_sent and messages_failed
 * based on the configured ratios and interval.
 *
 * Uses `last_auto_increment` timestamp to prevent double-counting
 * even if multiple browser tabs are open.
 */
export function useAutoIncrement() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const tick = async () => {
      // Prevent overlapping ticks
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const now = new Date();

        // Fetch all running campaigns with auto-increment enabled
        const { data: campaigns, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('status', 'Running')
          .eq('auto_increment_enabled', true);

        if (error || !campaigns || campaigns.length === 0) {
          runningRef.current = false;
          return;
        }

        for (const campaign of campaigns) {
          const totalProcessed = campaign.messages_sent + campaign.messages_failed;
          const targetTotal = campaign.auto_increment_total || 0;

          // Check if campaign should be marked as completed
          const shouldComplete =
            (campaign.auto_increment_complete_at &&
              now >= new Date(campaign.auto_increment_complete_at)) ||
            (targetTotal > 0 && totalProcessed >= targetTotal);

          if (shouldComplete) {
            const sentRatio = parseFloat(String(campaign.auto_increment_sent_ratio)) / 100;
            const finalSent = Math.round(targetTotal * sentRatio);
            const finalFailed = targetTotal - finalSent;

            await supabase
              .from('campaigns')
              .update({
                status: 'Completed',
                auto_increment_enabled: false,
                messages_sent: finalSent,
                messages_failed: finalFailed,
                end_time: now.toISOString(),
              })
              .eq('id', campaign.id);

            // Send completion notification
            await supabase.from('notifications').insert({
              user_id: campaign.user_id,
              title: 'Campaign Completed ✅',
              message: `Your campaign "${campaign.name}" has finished! ${finalSent.toLocaleString()} messages delivered out of ${targetTotal.toLocaleString()}.`,
              type: 'campaign_completed',
              campaign_id: campaign.id,
            });

            continue;
          }

          // Check if enough time has passed since the last increment
          const lastIncrement = campaign.last_auto_increment
            ? new Date(campaign.last_auto_increment)
            : new Date(0);

          const secondsSinceLastIncrement =
            (now.getTime() - lastIncrement.getTime()) / 1000;
          const interval = campaign.auto_increment_interval || 5;

          if (secondsSinceLastIncrement >= interval) {
            const sentRatio = parseFloat(String(campaign.auto_increment_sent_ratio)) / 100;
            const failedRatio = parseFloat(String(campaign.auto_increment_failed_ratio)) / 100;

            // Determine how many messages to process in this tick
            // If we've fallen behind (e.g. tab was backgrounded), batch up
            const ticksToProcess = Math.min(
              Math.floor(secondsSinceLastIncrement / interval),
              50 // cap at 50 per tick to avoid huge batch updates
            );

            let newSent = campaign.messages_sent;
            let newFailed = campaign.messages_failed;

            for (let i = 0; i < ticksToProcess; i++) {
              if (newSent + newFailed >= targetTotal && targetTotal > 0) break;

              const shouldFail =
                Math.random() < failedRatio / (sentRatio + failedRatio);

              if (shouldFail) {
                newFailed++;
              } else {
                newSent++;
              }
            }

            // Only update if something changed
            if (newSent !== campaign.messages_sent || newFailed !== campaign.messages_failed) {
              await supabase
                .from('campaigns')
                .update({
                  messages_sent: newSent,
                  messages_failed: newFailed,
                  last_auto_increment: now.toISOString(),
                })
                .eq('id', campaign.id);
            }
          }
        }
      } catch (err) {
        console.error('[AutoIncrement] Error:', err);
      } finally {
        runningRef.current = false;
      }
    };

    // Run immediately, then every 3 seconds
    tick();
    timerRef.current = setInterval(tick, 3000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
}
