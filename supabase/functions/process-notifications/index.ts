// Supabase Edge Function: process-notifications
// Drains queued/retryable rows from notification_outbox via the system sender.
// Call periodically (cron) or manually after connecting the system sender /
// getting templates approved. Idempotent per row.
//
// Deploy: supabase functions deploy process-notifications --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { trySend } from '../_shared/notify.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const MAX_ATTEMPTS = 8;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

Deno.serve(async (req: Request) => {
  // Optional shared-secret guard for cron; if CRON_SECRET unset, allow (service-role fn).
  if (CRON_SECRET) {
    const s = req.headers.get('X-Cron-Secret') ?? '';
    if (s !== CRON_SECRET) return json({ error: 'unauthorized' }, 401);
  }

  try {
    const { data: rows } = await db.from('notification_outbox')
      .select('id, to_phone, template_name, language, params, attempts')
      .eq('status', 'queued').lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true }).limit(50);

    if (!rows || rows.length === 0) return json({ ok: true, processed: 0 });

    let sent = 0, queued = 0, failed = 0;
    for (const r of rows) {
      const status = await trySend(db, r.id, r.to_phone, r.template_name, r.language, (r.params as any[]) ?? []);
      if (status === 'sent') sent++; else if (status === 'queued') queued++; else failed++;
      // bump attempts on the ones still queued so they don't spin forever
      if (status === 'queued') {
        await db.from('notification_outbox').update({ attempts: (r.attempts ?? 0) + 1 }).eq('id', r.id);
      }
    }
    return json({ ok: true, processed: rows.length, sent, still_queued: queued, failed });
  } catch (err: any) {
    console.error('[process-notifications] error', err);
    return json({ error: err.message || 'error' }, 500);
  }
});
