/**
 * notify — platform automated-WhatsApp helper.
 * Enqueues a notification into `notification_outbox`, then best-effort sends it
 * NOW via the single system-sender WABA (whatsapp_accounts.is_system = true) using
 * an approved template. If the sender isn't connected yet or the template isn't
 * approved, the row simply stays 'queued'/'failed' and `process-notifications`
 * retries later — nothing is lost.
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const GRAPH = `https://graph.facebook.com/${Deno.env.get('META_GRAPH_VERSION') ?? 'v25.0'}`;
// ReachPeak's official support / system-sender number (E.164 digits, no +).
export const SUPPORT_PHONE = (Deno.env.get('SUPPORT_PHONE') ?? '918583021893').replace(/[^0-9]/g, '');

export interface NotifyInput {
  to_phone: string;                 // E.164 digits, no +
  template_name: string;
  language?: string;
  params?: (string | number)[];     // ordered body params
  audience?: 'user' | 'support' | 'admin';
  related_type?: 'ticket' | 'callback' | 'onboarding';
  related_id?: string;
}

/** Build WhatsApp template components from ordered body params. */
function templateComponents(params: (string | number)[]) {
  if (!params || params.length === 0) return undefined;
  return [{
    type: 'body',
    parameters: params.map(p => ({ type: 'text', text: String(p) })),
  }];
}

/**
 * Enqueue + best-effort send one automated WhatsApp. Never throws — returns the
 * outbox row status so callers can proceed regardless of send success.
 */
export async function notify(db: SupabaseClient, input: NotifyInput): Promise<{ id: string; status: string }> {
  const to = (input.to_phone ?? '').replace(/[^0-9]/g, '');
  const row = {
    to_phone: to,
    template_name: input.template_name,
    language: input.language ?? 'en',
    params: input.params ?? [],
    audience: input.audience ?? 'user',
    related_type: input.related_type ?? null,
    related_id: input.related_id ?? null,
    status: 'queued' as string,
  };

  const { data: inserted, error: insErr } = await db.from('notification_outbox').insert(row).select('id').single();
  const outboxId = inserted?.id as string | undefined;
  if (insErr || !outboxId) {
    console.error('[notify] outbox insert failed:', insErr?.message);
    return { id: '', status: 'failed' };
  }

  // Best-effort immediate send.
  const status = await trySend(db, outboxId, row.to_phone, row.template_name, row.language, input.params ?? []);
  return { id: outboxId, status };
}

/** Attempt to send one queued outbox row via the system sender. Updates the row. */
export async function trySend(
  db: SupabaseClient,
  outboxId: string,
  toPhone: string,
  templateName: string,
  language: string,
  params: (string | number)[],
): Promise<string> {
  try {
    // 1. Find the system sender WABA.
    const { data: sender } = await db.from('whatsapp_accounts')
      .select('id, phone_number_id')
      .eq('is_system', true).eq('is_active', true).maybeSingle();

    if (!sender?.phone_number_id) {
      await db.from('notification_outbox').update({
        status: 'queued', attempts: 0,
        last_error: 'no_system_sender_connected',
      }).eq('id', outboxId);
      return 'queued';
    }

    // 2. Decrypt the sender's WABA token.
    const { data: token, error: tokErr } = await db.rpc('get_waba_access_token', { p_account_id: sender.id });
    if (tokErr || !token) {
      await db.from('notification_outbox').update({
        status: 'failed', last_error: 'sender_token_decrypt_failed',
      }).eq('id', outboxId);
      return 'failed';
    }

    // 3. Send the template.
    const payload = {
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        ...(templateComponents(params) ? { components: templateComponents(params) } : {}),
      },
    };
    const res = await fetch(`${GRAPH}/${sender.phone_number_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = out?.error?.message || `http_${res.status}`;
      // Template-not-approved / not-found → keep queued for later retry (recoverable).
      const recoverable = /template|not.*found|rate/i.test(errMsg);
      await db.from('notification_outbox').update({
        status: recoverable ? 'queued' : 'failed',
        attempts: 1, last_error: errMsg,
      }).eq('id', outboxId);
      return recoverable ? 'queued' : 'failed';
    }

    const wamid = out?.messages?.[0]?.id ?? null;
    await db.from('notification_outbox').update({
      status: 'sent', wamid, sent_at: new Date().toISOString(), last_error: null,
    }).eq('id', outboxId);
    return 'sent';
  } catch (e: any) {
    await db.from('notification_outbox').update({
      status: 'failed', last_error: e?.message ?? 'send_exception',
    }).eq('id', outboxId);
    return 'failed';
  }
}
