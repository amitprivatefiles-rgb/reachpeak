// Supabase Edge Function: data-deletion
// Handles Meta's data deletion callback requests.
// Meta sends a POST with a signed_request when a user requests data deletion.
// We return a confirmation URL and status code.
//
// Deploy: supabase functions deploy data-deletion --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { decode as base64Decode } from 'https://deno.land/std@0.208.0/encoding/base64url.ts';

const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Parse Meta's signed_request (base64url encoded)
function parseSignedRequest(signedRequest: string): { user_id: string } | null {
  try {
    const parts = signedRequest.split('.');
    if (parts.length !== 2) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64Decode(parts[1])));
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  // GET: Status check page
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const confirmationCode = url.searchParams.get('code');
    
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>Data Deletion Status - ReachPeak API</title></head>
      <body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>Data Deletion Request</h1>
        <p><strong>Confirmation Code:</strong> ${confirmationCode || 'N/A'}</p>
        <p><strong>Status:</strong> Your data deletion request has been received and is being processed.</p>
        <p>All associated data will be permanently deleted within 30 days.</p>
        <p>If you have questions, contact <a href="mailto:support@reachpeakapi.in">support@reachpeakapi.in</a></p>
        <hr>
        <p style="color: #888; font-size: 12px;">ReachPeak API — reachpeakapi.in</p>
      </body>
      </html>`,
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } },
    );
  }

  // POST: Data deletion callback from Meta
  if (req.method === 'POST') {
    try {
      const formData = await req.formData();
      const signedRequest = formData.get('signed_request') as string;

      if (!signedRequest) {
        return json({ error: 'Missing signed_request' }, 400);
      }

      const payload = parseSignedRequest(signedRequest);
      const metaUserId = payload?.user_id || 'unknown';

      // Generate a unique confirmation code
      const confirmationCode = crypto.randomUUID().split('-')[0].toUpperCase();

      // Log the deletion request
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // Store the deletion request for processing
      await supabase.from('activity_logs').insert({
        action: 'data_deletion_request',
        details: {
          meta_user_id: metaUserId,
          confirmation_code: confirmationCode,
          requested_at: new Date().toISOString(),
          status: 'pending',
        },
      }).catch(() => {
        // activity_logs might not exist or have different schema — log to console
        console.log(`Data deletion request: meta_user_id=${metaUserId}, code=${confirmationCode}`);
      });

      // Return the response Meta expects
      const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/data-deletion?code=${confirmationCode}`;

      return json({
        url: callbackUrl,
        confirmation_code: confirmationCode,
      });

    } catch (e) {
      console.error('Data deletion error:', (e as Error).message);
      return json({ error: 'Processing failed' }, 500);
    }
  }

  return json({ error: 'Method not allowed' }, 405);
});
