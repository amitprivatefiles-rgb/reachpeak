import 'dotenv/config';
import { supabase } from './supabase.js';
import { claimMessages, ClaimedMessage } from './claim.js';
import { sendWhatsAppMessage } from './sender.js';

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '2000', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);

// Cache for whatsapp_accounts to avoid repeated lookups within a tick
const accountCache = new Map<string, { phone_number_id: string; access_token: string }>();

// ── Wallet billing settlement (idempotent by ref 'msg:<id>') ──
// The hold was placed by partner-send at enqueue time. On a real send we settle it
// (money leaves), on failure we release it (refund to balance). No-op if no hold exists.
async function settleCharge(messageId: string) {
  const { error } = await supabase.rpc('wallet_settle', { p_reference: 'msg:' + messageId });
  if (error) console.error(`[Worker] wallet_settle failed for ${messageId}:`, error.message);
}
async function releaseCharge(messageId: string) {
  const { error } = await supabase.rpc('wallet_release', { p_reference: 'msg:' + messageId });
  if (error) console.error(`[Worker] wallet_release failed for ${messageId}:`, error.message);
}

async function getAccount(accountId: string) {
  const cached = accountCache.get(accountId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('whatsapp_accounts')
    .select('phone_number_id')
    .eq('id', accountId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error(`[Worker] Account ${accountId} not found or inactive`);
    return null;
  }

  // Decrypt WABA token from Vault via RPC
  const { data: accessToken, error: tokenErr } = await supabase.rpc('get_waba_access_token', {
    p_account_id: accountId,
  });

  if (tokenErr || !accessToken) {
    console.error(`[Worker] Failed to decrypt token for account ${accountId}`);
    return null;
  }

  const account = { phone_number_id: data.phone_number_id, access_token: accessToken };
  accountCache.set(accountId, account);
  return account;
}

async function processMessages(messages: ClaimedMessage[]) {
  // Group by whatsapp_account_id for rate-limiting per number
  const groups = new Map<string, ClaimedMessage[]>();
  for (const msg of messages) {
    const list = groups.get(msg.whatsapp_account_id) || [];
    list.push(msg);
    groups.set(msg.whatsapp_account_id, list);
  }

  for (const [accountId, msgs] of groups) {
    const account = await getAccount(accountId);
    if (!account) {
      // Mark all messages in this group as failed
      const ids = msgs.map((m) => m.id);
      await supabase
        .from('messages')
        .update({
          status: 'failed',
          error_code: 'ACCOUNT_NOT_FOUND',
          error_message: 'WhatsApp account not found or inactive',
          failed_at: new Date().toISOString(),
        })
        .in('id', ids);
      // Refund the wallet holds — these messages were never sent.
      for (const id of ids) await releaseCharge(id);
      continue;
    }

    for (const msg of msgs) {
      const result = await sendWhatsAppMessage(
        account.phone_number_id,
        account.access_token,
        msg.wa_to,
        msg.message_type,
        msg.content
      );

      if (result.success) {
        await supabase
          .from('messages')
          .update({
            status: 'sent',
            wamid: result.wamid,
            sent_at: new Date().toISOString(),
          })
          .eq('id', msg.id);

        // Settle the wallet hold — the message really went out, money is now spent.
        await settleCharge(msg.id);

        console.log(`[Worker] Sent ${msg.id} → wamid=${result.wamid} to=${msg.wa_to}`);
      } else {
        await supabase
          .from('messages')
          .update({
            status: 'failed',
            error_code: result.errorCode || null,
            error_message: result.errorMessage || null,
            failed_at: new Date().toISOString(),
          })
          .eq('id', msg.id);

        // Refund the wallet hold — the message did not send.
        await releaseCharge(msg.id);

        console.error(`[Worker] Failed ${msg.id}: ${result.errorCode} — ${result.errorMessage}`);
      }
    }
  }
}

const STALE_THRESHOLD_MIN = 10;

/**
 * Recover rows stranded in 'sending' after a worker crash.
 * - With wamid → the message DID go out, mark 'sent'
 * - Without wamid → ambiguous, mark 'failed' (do NOT re-queue to avoid double-send)
 */
async function recoverStaleClaims() {
  const threshold = new Date(Date.now() - STALE_THRESHOLD_MIN * 60 * 1000).toISOString();

  // Rows with wamid: the send succeeded but we crashed before writing 'sent'
  const { data: recovered, error: recErr } = await supabase
    .from('messages')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('status', 'sending')
    .not('wamid', 'is', null)
    .lt('claimed_at', threshold)
    .select('id');

  if (!recErr && recovered && recovered.length > 0) {
    for (const r of recovered) await settleCharge(r.id); // they went out → settle
    console.log(`[Recovery] ${recovered.length} stale rows with wamid → sent`);
  }

  // Rows without wamid: ambiguous crash, mark failed for manual review
  const { data: failed, error: failErr } = await supabase
    .from('messages')
    .update({
      status: 'failed',
      error_code: 'STALE_CLAIM',
      error_message: 'stale_claim',
      failed_at: new Date().toISOString(),
    })
    .eq('status', 'sending')
    .is('wamid', null)
    .lt('claimed_at', threshold)
    .select('id');

  if (!failErr && failed && failed.length > 0) {
    for (const r of failed) await releaseCharge(r.id); // ambiguous, not confirmed sent → refund
    console.warn(`[Recovery] ${failed.length} stale rows without wamid → failed (stale_claim)`);
  }
}

async function tick() {
  try {
    // Sweep stale claims before claiming new ones
    await recoverStaleClaims();

    const messages = await claimMessages(BATCH_SIZE);
    if (messages.length === 0) return;

    console.log(`[Worker] Claimed ${messages.length} messages`);
    await processMessages(messages);
  } catch (err: any) {
    console.error('[Worker] Tick error:', err.message);
  }
}

// ---------- Main ----------
let running = true;

function shutdown() {
  console.log('[Worker] Shutting down...');
  running = false;
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main() {
  console.log(`[Worker] Started — polling every ${POLL_INTERVAL}ms, batch=${BATCH_SIZE}`);

  while (running) {
    await tick();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  console.log('[Worker] Stopped.');
  process.exit(0);
}

main();
