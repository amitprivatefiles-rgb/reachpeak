import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Time-aware auto-increment engine for campaign message counters.
 *
 * KEY DESIGN: The system paces message delivery so campaigns complete
 * exactly at the admin-set target completion time.
 *
 * Algorithm:
 * 1. Admin sets: total_target, sent_ratio, failed_ratio, complete_at
 * 2. Each tick (every 3s), the engine calculates:
 *    - messages_remaining = total_target - (sent + failed)
 *    - time_remaining = complete_at - now (in seconds)
 *    - ticks_remaining = time_remaining / TICK_INTERVAL
 *    - messages_this_tick = ceil(messages_remaining / ticks_remaining)
 * 3. For each message in this tick, randomly assign sent/failed per ratio
 * 4. When complete_at is reached, force-set exact final numbers
 *
 * This ensures campaigns finish precisely on time regardless of total count.
 * Uses `last_auto_increment` timestamp to prevent double-counting
 * across multiple browser tabs.
 */

const TICK_INTERVAL_MS = 3000; // Poll every 3 seconds
const TICK_INTERVAL_S = TICK_INTERVAL_MS / 1000;
// Minimum gap between DB updates to prevent double-counting across tabs
const MIN_UPDATE_GAP_S = 2;

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
        const nowMs = now.getTime();

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
          const totalTarget = campaign.auto_increment_total || 0;
          if (totalTarget <= 0) continue;

          const currentSent = campaign.messages_sent || 0;
          const currentFailed = campaign.messages_failed || 0;
          const totalProcessed = currentSent + currentFailed;
          const messagesRemaining = totalTarget - totalProcessed;

          const sentRatio = parseFloat(String(campaign.auto_increment_sent_ratio)) / 100;
          const failedRatio = parseFloat(String(campaign.auto_increment_failed_ratio)) / 100;
          const ratioSum = sentRatio + failedRatio;

          // Calculate final exact numbers based on ratio
          const finalSent = Math.round(totalTarget * (sentRatio / ratioSum));
          const finalFailed = totalTarget - finalSent;

          // ===== COMPLETION CHECK =====
          // Complete if: target reached OR completion time has passed
          const completeAt = campaign.auto_increment_complete_at
            ? new Date(campaign.auto_increment_complete_at)
            : null;

          const shouldComplete =
            totalProcessed >= totalTarget ||
            (completeAt && nowMs >= completeAt.getTime());

          if (shouldComplete) {
            await supabase
              .from('campaigns')
              .update({
                status: 'Completed',
                auto_increment_enabled: false,
                messages_sent: finalSent,
                messages_failed: finalFailed,
                end_time: now.toISOString(),
                last_auto_increment: now.toISOString(),
              })
              .eq('id', campaign.id);

            // Send completion notification
            await supabase.from('notifications').insert({
              user_id: campaign.user_id,
              title: 'Campaign Completed ✅',
              message: `Your campaign "${campaign.name}" has finished! ${finalSent.toLocaleString()} messages delivered out of ${totalTarget.toLocaleString()}.`,
              type: 'campaign_completed',
              campaign_id: campaign.id,
            });

            continue;
          }

          // ===== DEDUPLICATION CHECK =====
          // Ensure minimum gap between updates to prevent double-counting from multiple tabs
          const lastIncrement = campaign.last_auto_increment
            ? new Date(campaign.last_auto_increment)
            : new Date(0);
          const secondsSinceLastUpdate = (nowMs - lastIncrement.getTime()) / 1000;

          if (secondsSinceLastUpdate < MIN_UPDATE_GAP_S) {
            continue; // Another tab recently updated, skip this tick
          }

          // ===== TIME-AWARE PACING =====
          if (messagesRemaining <= 0) continue;

          let messagesThisTick: number;

          if (completeAt) {
            // TIME-PACED MODE: Calculate based on remaining time
            const timeRemainingS = Math.max(0, (completeAt.getTime() - nowMs) / 1000);

            if (timeRemainingS <= TICK_INTERVAL_S) {
              // Less than one tick left — send all remaining
              messagesThisTick = messagesRemaining;
            } else {
              // Calculate how many ticks remain until completion
              const ticksRemaining = timeRemainingS / TICK_INTERVAL_S;
              // Messages per tick, ensuring we don't under-deliver
              // Use ceil to ensure we don't fall behind schedule
              const rawPerTick = messagesRemaining / ticksRemaining;

              // Add slight jitter (±15%) to make the delivery feel natural
              const jitter = 0.85 + Math.random() * 0.30; // 0.85 to 1.15
              messagesThisTick = Math.max(1, Math.round(rawPerTick * jitter));

              // Never exceed what's remaining
              messagesThisTick = Math.min(messagesThisTick, messagesRemaining);
            }
          } else {
            // NO COMPLETION TIME SET — use the legacy interval-based approach
            // Default: ~1 message per interval
            const interval = campaign.auto_increment_interval || 5;
            if (secondsSinceLastUpdate < interval) continue;

            const ticksToProcess = Math.min(
              Math.floor(secondsSinceLastUpdate / interval),
              20
            );
            messagesThisTick = Math.max(1, ticksToProcess);
            messagesThisTick = Math.min(messagesThisTick, messagesRemaining);
          }

          // ===== DISTRIBUTE SENT vs FAILED =====
          // Use deterministic distribution to ensure final ratio is accurate
          let newSent = currentSent;
          let newFailed = currentFailed;

          for (let i = 0; i < messagesThisTick; i++) {
            const totalAfter = newSent + newFailed + 1;
            if (totalAfter > totalTarget) break;

            // Calculate what the sent count "should" be at this total
            const expectedSent = Math.round(totalAfter * (sentRatio / ratioSum));
            const currentSentCount = newSent;

            // If we're behind on sent, add a sent. Otherwise add a failed.
            // Add randomness only when we're close to the expected ratio
            const sentDeficit = expectedSent - currentSentCount;
            if (sentDeficit > 1) {
              newSent++;
            } else if (sentDeficit < 0) {
              newFailed++;
            } else {
              // Close to expected — use weighted random
              if (Math.random() < (sentRatio / ratioSum)) {
                newSent++;
              } else {
                newFailed++;
              }
            }
          }

          // Only update if something changed
          if (newSent !== currentSent || newFailed !== currentFailed) {
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
      } catch (err) {
        console.error('[AutoIncrement] Error:', err);
      } finally {
        runningRef.current = false;
      }
    };

    // Run immediately, then every TICK_INTERVAL
    tick();
    timerRef.current = setInterval(tick, TICK_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
}
