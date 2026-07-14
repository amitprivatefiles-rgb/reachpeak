// Supabase Edge Function: callback-retry
// Called by pg_cron every minute to retry failed callbacks.
//
// Deploy: supabase functions deploy callback-retry --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { retryPendingCallbacks } from '../_shared/callbackDispatcher.ts';

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

Deno.serve(async (req: Request) => {
  // Accept from pg_cron (no auth needed — function is --no-verify-jwt but called internally)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const result = await retryPendingCallbacks(db, 100);

  console.log(`[callback-retry] processed=${result.processed} delivered=${result.delivered} failed=${result.failed}`);

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
});
