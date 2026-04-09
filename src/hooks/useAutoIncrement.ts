import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Absolute-time-based auto-increment engine for campaign message counters.
 *
 * ARCHITECTURE: Instead of calculating "messages per tick", this engine
 * calculates "what should the total be RIGHT NOW?" based on elapsed time
 * as a fraction of total campaign duration.
 *
 * This approach solves:
 * 1. Browser tab backgrounding (self-corrects regardless of tick frequency)
 * 2. Race conditions (multiple tabs SET same values = idempotent)
 * 3. Catch-up after offline periods (jumps to correct position)
 *
 * Algorithm:
 *   elapsed_fraction = (now - start_time) / (complete_at - start_time)
 *   expected_total   = round(totalTarget × elapsed_fraction)
 *   expected_sent    = round(expected_total × sentRatio)
 *   expected_failed  = expected_total - expected_sent
 *   → SET messages_sent = max(current, expected_sent)
 *   → SET messages_failed = max(current, expected_failed)
 *
 * When complete_at is reached:
 *   → Force exact final numbers and mark Completed
 */

const TICK_INTERVAL_MS = 3000; // Poll every 3 seconds
const MIN_UPDATE_GAP_S = 2;   // Minimum gap between updates (dedup for multiple tabs)

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

          const sentRatio = parseFloat(String(campaign.auto_increment_sent_ratio)) / 100;
          const failedRatio = parseFloat(String(campaign.auto_increment_failed_ratio)) / 100;
          const ratioSum = sentRatio + failedRatio || 1; // Prevent division by zero

          // Calculate final exact numbers based on ratio
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
            // Use completeAt as end_time if it's in the past, otherwise use now
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
          const lastIncrement = campaign.last_auto_increment
            ? new Date(campaign.last_auto_increment)
            : new Date(0);
          const secondsSinceLastUpdate = (nowMs - lastIncrement.getTime()) / 1000;

          if (secondsSinceLastUpdate < MIN_UPDATE_GAP_S) {
            continue; // Another tab recently updated, skip
          }

          // ===== ABSOLUTE TIME-BASED PACING =====
          // Instead of "how many per tick?", calculate "where should we be RIGHT NOW?"
          
          if (completeAt) {
            // Get campaign start time (when admin approved)
            const startTime = campaign.start_time
              ? new Date(campaign.start_time)
              : new Date(campaign.approved_at || campaign.created_at);

            const totalDurationMs = completeAt.getTime() - startTime.getTime();
            
            if (totalDurationMs <= 0) continue; // Invalid duration

            const elapsedMs = nowMs - startTime.getTime();
            
            // How far through the campaign are we? (0.0 to 1.0)
            let elapsedFraction = Math.max(0, Math.min(1, elapsedMs / totalDurationMs));

            // Add subtle jitter (±1%) to prevent perfectly smooth curve
            // This makes the delivery pattern look more natural
            const jitter = (Math.random() - 0.5) * 0.02;
            elapsedFraction = Math.max(0, Math.min(1, elapsedFraction + jitter));

            // Calculate what totals SHOULD be right now
            const expectedTotal = Math.round(totalTarget * elapsedFraction);
            const expectedSent = Math.round(expectedTotal * (sentRatio / ratioSum));
            const expectedFailed = expectedTotal - expectedSent;

            // Only move forward (monotonically increasing)
            // This also makes it idempotent — if two tabs calculate the same
            // expected values, writing the same numbers is harmless
            const newSent = Math.max(currentSent, expectedSent);
            const newFailed = Math.max(currentFailed, expectedFailed);

            // Cap at final values
            const cappedSent = Math.min(newSent, finalSent);
            const cappedFailed = Math.min(newFailed, finalFailed);

            // Only update if something changed
            if (cappedSent !== currentSent || cappedFailed !== currentFailed) {
              await supabase
                .from('campaigns')
                .update({
                  messages_sent: cappedSent,
                  messages_failed: cappedFailed,
                  last_auto_increment: now.toISOString(),
                })
                .eq('id', campaign.id);
            }
          } else {
            // NO COMPLETION TIME — legacy interval-based fallback
            // (This path should rarely be used since approval now requires completion time)
            const interval = campaign.auto_increment_interval || 5;
            if (secondsSinceLastUpdate < interval) continue;

            const messagesRemaining = totalTarget - totalProcessed;
            if (messagesRemaining <= 0) continue;

            const ticksToProcess = Math.min(
              Math.floor(secondsSinceLastUpdate / interval),
              20
            );
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
            }
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
