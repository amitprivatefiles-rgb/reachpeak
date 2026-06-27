// Supabase Edge Function: enqueue-campaign
// Server-side campaign message enqueuing. Replaces the broken client-side
// insert that was blocked by RLS (admin has no INSERT policy on messages).
//
// Auth:   JWT verification ON (admin action)
// Input:  { campaign_id: string }
// Output: { enqueued: number, failed: number, errors: string[] }
//
// Deploy: supabase functions deploy enqueue-campaign
//         (JWT verification is ON — do NOT pass --no-verify-jwt)

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildTemplateSendComponents,
  missingRequiredHeaderMedia,
} from '../_shared/templatePayload.ts';
import type { StoredTemplate, RuntimeInputs } from '../_shared/templatePayload.ts';

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

Deno.serve(async (req: Request) => {
  /* ── CORS preflight ── */
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    /* ── Supabase admin client (service role — bypasses RLS) ── */
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
      data: { user: caller },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (authErr || !caller)
      return json(
        { error: 'Unauthorized: ' + (authErr?.message || 'No user found') },
        401,
      );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!profile || profile.role !== 'admin')
      return json(
        {
          error:
            'Admin access required. Your role: ' + (profile?.role || 'none'),
        },
        403,
      );

    /* ── 2. Parse input ── */
    const { campaign_id } = await req.json();
    if (!campaign_id)
      return json({ error: 'campaign_id is required' }, 400);

    /* ── 3. Load campaign ── */
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('campaigns')
      .select(
        'id, user_id, name, message_template, template_id, template_language, ' +
        'variable_mapping, selected_audience, whatsapp_account_id',
      )
      .eq('id', campaign_id)
      .single();

    if (campErr || !campaign)
      return json(
        { error: 'Campaign not found: ' + (campErr?.message || campaign_id) },
        404,
      );

    const audience = campaign.selected_audience as any;
    const msgMode = audience?.message_mode || 'freetext';
    const varMap: Record<string, string> = campaign.variable_mapping || {};
    const paramKeys = Object.keys(varMap).sort(
      (a, b) => parseInt(a) - parseInt(b),
    );
    const headerOverride: string | null =
      audience?.header_override_url || null;
    const lang = campaign.template_language || 'en';
    const templateName = campaign.message_template;

    /* ── 4. Load WhatsApp account (campaign owner's active account) ── */
    const { data: waAccount } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('id, display_phone_number')
      .eq('user_id', campaign.user_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!waAccount) {
      await supabaseAdmin
        .from('campaigns')
        .update({
          status: 'failed',
          end_time: new Date().toISOString(),
        })
        .eq('id', campaign_id);
      return json(
        { error: 'No active WhatsApp account for campaign owner', enqueued: 0, failed: 0, errors: ['NO_ACTIVE_ACCOUNT'] },
        422,
      );
    }

    /* ── 5. Load template (by template_id, fallback to name) ── */
    let tplRow: StoredTemplate | null = null;
    if (msgMode === 'template' && campaign.template_id) {
      const { data } = await supabaseAdmin
        .from('templates')
        .select('name, language, components, body_text, header_sample_url')
        .eq('id', campaign.template_id)
        .limit(1)
        .maybeSingle();
      tplRow = data;
      // Fallback to name lookup
      if (!tplRow && templateName) {
        const { data: fallback } = await supabaseAdmin
          .from('templates')
          .select('name, language, components, body_text, header_sample_url')
          .eq('whatsapp_account_id', waAccount.id)
          .eq('name', templateName)
          .limit(1)
          .maybeSingle();
        tplRow = fallback;
      }
    }

    const waFrom =
      waAccount.display_phone_number?.replace(/[^0-9]/g, '') || '';

    /* ── 6. Resolve recipients based on audience mode ── */
    interface Recipient {
      phone: string;
      contact: any | null; // null for manual mode
    }
    const recipients: Recipient[] = [];
    const contactFields =
      'id, phone_number, name, city, state, lead_type, source, notes';

    if (audience?.mode === 'manual' && Array.isArray(audience?.numbers)) {
      // Manual mode: numbers stored directly, no contact records
      for (const phone of audience.numbers) {
        recipients.push({ phone: String(phone).replace(/[^0-9]/g, ''), contact: null });
      }
    } else if (audience?.mode === 'tag' && audience?.tag_filter) {
      const { data: ctData } = await supabaseAdmin
        .from('contact_tags')
        .select('contact_id')
        .eq('tag_id', audience.tag_filter)
        .eq('user_id', campaign.user_id);
      const ids = (ctData || []).map((ct: any) => ct.contact_id);
      if (ids.length > 0) {
        const { data } = await supabaseAdmin
          .from('contacts')
          .select(contactFields)
          .eq('user_id', campaign.user_id)
          .in('id', ids)
          .eq('is_blacklisted', false);
        for (const c of data || []) {
          recipients.push({
            phone: c.phone_number.replace(/[^0-9]/g, ''),
            contact: c,
          });
        }
      }
    } else if (audience?.mode === 'source' && audience?.source_filter) {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select(contactFields)
        .eq('user_id', campaign.user_id)
        .eq('source', audience.source_filter)
        .eq('is_blacklisted', false);
      for (const c of data || []) {
        recipients.push({
          phone: c.phone_number.replace(/[^0-9]/g, ''),
          contact: c,
        });
      }
    } else if (audience?.mode === 'campaign' && audience?.campaign_filter) {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select(contactFields)
        .eq('user_id', campaign.user_id)
        .eq('campaign_id', audience.campaign_filter)
        .eq('is_blacklisted', false);
      for (const c of data || []) {
        recipients.push({
          phone: c.phone_number.replace(/[^0-9]/g, ''),
          contact: c,
        });
      }
    } else {
      // 'all' or fallback
      const { data } = await supabaseAdmin
        .from('contacts')
        .select(contactFields)
        .eq('user_id', campaign.user_id)
        .eq('is_blacklisted', false);
      for (const c of data || []) {
        recipients.push({
          phone: c.phone_number.replace(/[^0-9]/g, ''),
          contact: c,
        });
      }
    }

    /* ── 7. Build per-recipient message rows ── */
    const queuedRows: any[] = [];
    const failedRows: any[] = [];
    const errors: string[] = [];

    // Helper: check if header media is required but missing
    const checkHeaderMedia = (
      tpl: any,
      override: string | null,
    ): boolean => {
      const comps = tpl?.components || [];
      const hdr = comps.find(
        (c: any) => String(c.type).toUpperCase() === 'HEADER',
      );
      if (!hdr) return false;
      const fmt = String(hdr.format || '').toUpperCase();
      if (fmt === 'IMAGE' || fmt === 'VIDEO' || fmt === 'DOCUMENT') {
        return !(override || tpl.header_sample_url);
      }
      return false;
    };

    for (const { phone, contact } of recipients) {
      const baseRow = {
        user_id: campaign.user_id,
        whatsapp_account_id: waAccount.id,
        contact_id: contact?.id || null,
        campaign_id: campaign.id,
        direction: 'outbound',
        wa_from: waFrom,
        wa_to: phone,
        message_type: msgMode === 'template' ? 'template' : 'text',
        template_name: msgMode === 'template' ? templateName : null,
      };

      if (msgMode === 'template' && tplRow) {
        // Check required header media
        if (checkHeaderMedia(tplRow, headerOverride)) {
          failedRows.push({
            ...baseRow,
            content: {
              messaging_product: 'whatsapp',
              to: phone,
              type: 'template',
              template: {
                name: tplRow.name,
                language: { code: lang },
              },
            },
            status: 'failed',
            error_code: 'MISSING_HEADER_MEDIA',
            error_message: 'Template requires header media but none provided',
            failed_at: new Date().toISOString(),
          });
          continue;
        }

        // Check variable mapping — for manual mode without contact, use empty strings
        let bodyParams: string[] = [];
        if (paramKeys.length > 0) {
          if (contact) {
            let missingField: string | null = null;
            for (const key of paramKeys) {
              const field = varMap[key];
              const value = contact[field];
              if (
                value === null ||
                value === undefined ||
                String(value).trim() === ''
              ) {
                missingField = field;
                break;
              }
            }
            if (missingField) {
              failedRows.push({
                ...baseRow,
                content: {
                  messaging_product: 'whatsapp',
                  to: phone,
                  type: 'template',
                  template: {
                    name: tplRow.name,
                    language: { code: lang },
                  },
                },
                status: 'failed',
                error_code: 'MISSING_VARIABLE',
                error_message: `missing_variable:${missingField}`,
                failed_at: new Date().toISOString(),
              });
              continue;
            }
            bodyParams = paramKeys.map((key) =>
              String(contact[varMap[key]]),
            );
          } else {
            // Manual mode: no contact record — leave variables blank
            bodyParams = paramKeys.map(() => '');
          }
        }

        // Build send components using the shared builder
        const headerMedia =
          headerOverride || tplRow.header_sample_url || undefined;
        const components = buildTemplateSendComponents(tplRow, {
          headerMedia,
          bodyParams: bodyParams.length > 0 ? bodyParams : undefined,
        });

        queuedRows.push({
          ...baseRow,
          content: {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
              name: tplRow.name,
              language: { code: lang },
              components,
            },
          },
          status: 'queued',
        });
      } else if (msgMode === 'template' && !tplRow) {
        // Template mode but template not found — fail the row
        failedRows.push({
          ...baseRow,
          content: {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
              name: templateName || 'unknown',
              language: { code: lang },
            },
          },
          status: 'failed',
          error_code: 'TEMPLATE_NOT_FOUND',
          error_message: `Template '${templateName}' not found in database`,
          failed_at: new Date().toISOString(),
        });
      } else {
        // Free-text mode
        queuedRows.push({
          ...baseRow,
          content: {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: templateName || '' },
          },
          status: 'queued',
        });
      }
    }

    /* ── 8. Batch insert using service-role client (bypasses RLS) ── */
    // Insert failed rows first (immediately visible for reporting)
    if (failedRows.length > 0) {
      for (let i = 0; i < failedRows.length; i += 500) {
        const batch = failedRows.slice(i, i + 500);
        const { error: insertErr } = await supabaseAdmin
          .from('messages')
          .insert(batch);
        if (insertErr) {
          const msg = `Failed rows batch ${Math.floor(i / 500) + 1}: ${insertErr.message}`;
          console.error('[enqueue-campaign]', msg);
          errors.push(msg);
        }
      }
    }

    // Insert queued rows
    if (queuedRows.length > 0) {
      for (let i = 0; i < queuedRows.length; i += 500) {
        const batch = queuedRows.slice(i, i + 500);
        const { error: insertErr } = await supabaseAdmin
          .from('messages')
          .insert(batch);
        if (insertErr) {
          const msg = `Queued rows batch ${Math.floor(i / 500) + 1}: ${insertErr.message}`;
          console.error('[enqueue-campaign]', msg);
          errors.push(msg);
        }
      }
    }

    /* ── 9. Update campaign status & total ── */
    const totalRecipients =
      audience?.mode === 'manual'
        ? audience.numbers?.length || 0
        : queuedRows.length + failedRows.length;

    if (queuedRows.length > 0) {
      // Messages were enqueued — set campaign to Sending
      await supabaseAdmin
        .from('campaigns')
        .update({
          status: 'Sending',
          total_numbers: totalRecipients,
        })
        .eq('id', campaign_id);
    } else {
      // Zero queued rows — mark campaign as failed
      const reason =
        errors.length > 0
          ? errors.join('; ')
          : failedRows.length > 0
            ? `All ${failedRows.length} recipients failed validation`
            : 'No recipients resolved';
      await supabaseAdmin
        .from('campaigns')
        .update({
          status: 'Cancelled',
          total_numbers: totalRecipients,
          end_time: new Date().toISOString(),
        })
        .eq('id', campaign_id);
      errors.push(reason);
    }

    console.log(
      `[enqueue-campaign] campaign=${campaign_id} enqueued=${queuedRows.length} failed=${failedRows.length}`,
    );

    /* ── 10. Return result ── */
    return json({
      enqueued: queuedRows.length,
      failed: failedRows.length,
      errors,
    });
  } catch (err: any) {
    console.error('[enqueue-campaign] Unhandled error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
