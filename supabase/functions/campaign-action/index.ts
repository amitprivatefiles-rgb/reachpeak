// Supabase Edge Function: campaign-action
// Server-side campaign actions: retry, cancel, start_now.
// Required because messages RLS gives admins SELECT only — browser-side
// updates silently no-op (same class as the enqueue bug).
//
// Auth:   JWT verification ON (admin action)
// Input:  { campaign_id: string, action: 'retry' | 'cancel' | 'start_now' }
// Output: varies by action
//
// Deploy: supabase functions deploy campaign-action

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Non-retryable WhatsApp error codes (mirrored from src/lib/retryability.ts)
const NON_RETRYABLE_CODES = new Set([
  '131026', // Recipient not a WhatsApp user
  '131051', // Unsupported message type
  '100',    // Invalid parameter
  '368',    // Account temporarily locked
  '131031', // Account restricted
]);

function isRetryable(errorCode: string | null): boolean {
  if (!errorCode) return true;
  if (NON_RETRYABLE_CODES.has(errorCode)) return false;
  if (errorCode.startsWith('132')) return false;
  return true;
}

const MAX_RETRY_COUNT = 2;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    /* ── 1. Authenticate caller & verify admin role ── */
    const authHeader = req.headers.get('Authorization');
    if (!authHeader)
      return json({ error: 'Authorization header required' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user)
      return json({ error: 'Invalid token' }, 401);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || !profile.is_active)
      return json({ error: 'Admin access required' }, 403);

    /* ── 2. Parse input ── */
    const { campaign_id, action } = await req.json();
    if (!campaign_id)
      return json({ error: 'campaign_id is required' }, 400);
    if (!['retry', 'cancel', 'start_now'].includes(action))
      return json({ error: "action must be 'retry', 'cancel', or 'start_now'" }, 400);

    /* ── 3. Load campaign ── */
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, name, scheduled_start')
      .eq('id', campaign_id)
      .single();

    if (campErr || !campaign)
      return json({ error: 'Campaign not found' }, 404);

    /* ── ACTION: start_now ── */
    if (action === 'start_now') {
      // Only valid for scheduled campaigns (approved with scheduled_start)
      if (campaign.status !== 'approved') {
        return json({
          error: `Cannot start_now: campaign status is '${campaign.status}', expected 'approved'`,
        }, 400);
      }

      const { error: upErr } = await supabaseAdmin
        .from('campaigns')
        .update({ status: 'Sending', updated_at: new Date().toISOString() })
        .eq('id', campaign_id);

      if (upErr) {
        console.error('[campaign-action] start_now error:', upErr.message);
        return json({ error: upErr.message }, 500);
      }

      console.log(`[campaign-action] start_now campaign=${campaign_id}`);
      return json({ action: 'start_now', campaign_id, new_status: 'Sending' });
    }

    /* ── ACTION: cancel ── */
    if (action === 'cancel') {
      // Valid for Sending, Paused, or approved (scheduled)
      if (!['Sending', 'Paused', 'approved'].includes(campaign.status)) {
        return json({
          error: `Cannot cancel: campaign status is '${campaign.status}'`,
        }, 400);
      }

      // Cancel all queued/sending messages for this campaign
      const { data: cancelledMsgs, error: msgErr } = await supabaseAdmin
        .from('messages')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaign_id)
        .in('status', ['queued', 'sending'])
        .select('id');

      if (msgErr) {
        console.error('[campaign-action] cancel messages error:', msgErr.message);
        return json({ error: msgErr.message }, 500);
      }

      const cancelledCount = cancelledMsgs?.length || 0;

      // Set campaign to Cancelled
      await supabaseAdmin
        .from('campaigns')
        .update({
          status: 'Cancelled',
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaign_id);

      console.log(`[campaign-action] cancel campaign=${campaign_id} messages_cancelled=${cancelledCount}`);
      return json({
        action: 'cancel',
        campaign_id,
        messages_cancelled: cancelledCount,
        new_status: 'Cancelled',
      });
    }

    /* ── ACTION: retry ── */
    if (action === 'retry') {
      // Valid for Completed or Sending campaigns
      if (!['Completed', 'Sending'].includes(campaign.status)) {
        return json({
          error: `Cannot retry: campaign status is '${campaign.status}', expected 'Completed' or 'Sending'`,
        }, 400);
      }

      // Find all failed messages for this campaign
      const { data: failedMsgs, error: fetchErr } = await supabaseAdmin
        .from('messages')
        .select('id, error_code, retry_count, wamid')
        .eq('campaign_id', campaign_id)
        .eq('status', 'failed');

      if (fetchErr) {
        console.error('[campaign-action] fetch failed messages error:', fetchErr.message);
        return json({ error: fetchErr.message }, 500);
      }

      if (!failedMsgs || failedMsgs.length === 0) {
        return json({
          action: 'retry',
          campaign_id,
          requeued: 0,
          skipped: 0,
          reason: 'No failed messages to retry',
        });
      }

      // Classify: retryable vs non-retryable
      const retryableIds: string[] = [];
      let skippedNonRetryable = 0;
      let skippedMaxRetries = 0;
      let skippedHasWamid = 0;

      for (const msg of failedMsgs) {
        if (msg.wamid) {
          // wamid means Meta accepted it — delivery problem, not send failure
          skippedHasWamid++;
        } else if ((msg.retry_count ?? 0) >= MAX_RETRY_COUNT) {
          skippedMaxRetries++;
        } else if (!isRetryable(msg.error_code)) {
          skippedNonRetryable++;
        } else {
          retryableIds.push(msg.id);
        }
      }

      let requeued = 0;
      if (retryableIds.length > 0) {
        // Batch update in chunks of 500
        for (let i = 0; i < retryableIds.length; i += 500) {
          const batch = retryableIds.slice(i, i + 500);
          const { data: updated, error: upErr } = await supabaseAdmin
            .from('messages')
            .update({
              status: 'queued',
              claimed_at: null,
              error_code: null,
              error_message: null,
              failed_at: null,
              updated_at: new Date().toISOString(),
            })
            .in('id', batch)
            .select('id');

          if (upErr) {
            console.error(`[campaign-action] retry batch error:`, upErr.message);
          } else {
            requeued += updated?.length || 0;
          }
        }

        // Increment retry_count separately (can't do retry_count+1 in supabase-js update)
        // Use RPC or raw SQL
        await supabaseAdmin.rpc('increment_retry_count', {
          message_ids: retryableIds,
        }).then(({ error }) => {
          if (error) {
            // Fallback: the retry_count wasn't incremented, but messages are still requeued.
            // This is acceptable — worst case they get one extra retry.
            console.error('[campaign-action] increment_retry_count fallback:', error.message);
          }
        });

        // If campaign was Completed, flip back to Sending so the worker picks up requeued rows
        if (campaign.status === 'Completed') {
          await supabaseAdmin
            .from('campaigns')
            .update({
              status: 'Sending',
              end_time: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', campaign_id);
        }
      }

      const totalSkipped = skippedNonRetryable + skippedMaxRetries + skippedHasWamid;
      console.log(
        `[campaign-action] retry campaign=${campaign_id} requeued=${requeued} ` +
        `skipped=${totalSkipped} (non_retryable=${skippedNonRetryable} max_retries=${skippedMaxRetries} has_wamid=${skippedHasWamid})`,
      );

      return json({
        action: 'retry',
        campaign_id,
        requeued,
        skipped: totalSkipped,
        skipped_non_retryable: skippedNonRetryable,
        skipped_max_retries: skippedMaxRetries,
        skipped_has_wamid: skippedHasWamid,
        new_status: requeued > 0 && campaign.status === 'Completed' ? 'Sending' : campaign.status,
      });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err: any) {
    console.error('[campaign-action] Unhandled error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
