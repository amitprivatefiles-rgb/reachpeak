import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH_API_VERSION = Deno.env.get('GRAPH_API_VERSION') || 'v25.0';

// ─── Normalize Meta uppercase → lowercase ───
function normStatus(s: string | null | undefined): string {
  return (s || 'pending').toLowerCase();
}
function normCategory(s: string | null | undefined): string {
  return (s || 'marketing').toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResp({ error: 'Missing authorization header' }, 401);
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return jsonResp({ error: 'Invalid token' }, 401);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the tenant's WhatsApp account
    const { data: waAccount, error: waErr } = await serviceClient
      .from('whatsapp_accounts')
      .select('id, waba_id, phone_number_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (waErr || !waAccount) {
      return jsonResp({ error: 'No active WhatsApp account found. Connect one in Settings → WhatsApp.' }, 400);
    }

    // Decrypt WABA token from Vault
    const { data: accessToken, error: tokenErr } = await serviceClient.rpc('get_waba_access_token', { p_account_id: waAccount.id });
    if (tokenErr || !accessToken) {
      return jsonResp({ error: 'Failed to decrypt WhatsApp credentials' }, 500);
    }
    // Attach to waAccount for use in handlers
    (waAccount as any).access_token = accessToken;

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create':
        return await handleCreate(serviceClient, waAccount, user.id, body);
      case 'update':
        return await handleUpdate(serviceClient, waAccount, user.id, body);
      case 'delete':
        return await handleDelete(serviceClient, waAccount, user.id, body);
      case 'sync':
        return await handleSync(serviceClient, waAccount, user.id);
      default:
        return jsonResp({ error: `Unknown action: ${action}. Supported: create, update, delete, sync` }, 400);
    }
  } catch (err: any) {
    console.error('manage-template error:', err);
    return jsonResp({ error: err.message }, 500);
  }
});

// ─── CREATE ───
async function handleCreate(
  db: any,
  wa: { id: string; waba_id: string; access_token: string },
  userId: string,
  body: any
) {
  const { name, language, category, components } = body;
  if (!name || !language || !category || !components) {
    return jsonResp({ error: 'Missing required fields: name, language, category, components' }, 400);
  }

  // Validate name format (Meta rule: lowercase, underscores, starts with letter)
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return jsonResp({ error: 'Template name must be lowercase letters, digits, and underscores, starting with a letter' }, 400);
  }

  // Submit to Meta
  const metaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wa.waba_id}/message_templates`;
  const metaRes = await fetch(metaUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${wa.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, language, category: category.toUpperCase(), components }),
  });

  const metaJson = await metaRes.json();
  if (!metaRes.ok) {
    const errMsg = metaJson.error?.message || JSON.stringify(metaJson);
    return jsonResp({ error: `Meta API error: ${errMsg}` }, metaRes.status >= 400 ? metaRes.status : 400);
  }

  // Parse components to extract header/body/footer/buttons for the DB columns
  const parsed = parseComponents(components);

  // Insert into templates table — normalize status + category to lowercase
  const { data: template, error: insertErr } = await db
    .from('templates')
    .insert({
      user_id: userId,
      whatsapp_account_id: wa.id,
      name,
      language,
      category: normCategory(category),
      status: normStatus(metaJson.status || 'PENDING'),
      meta_template_id: metaJson.id,
      components,
      header: parsed.header,
      body_text: parsed.bodyText,
      footer: parsed.footer,
      buttons: parsed.buttons,
      variables: parsed.variables,
    })
    .select()
    .single();

  if (insertErr) {
    return jsonResp({ error: insertErr.message }, 500);
  }

  return jsonResp({ success: true, template });
}

// ─── DELETE (with journey guard) ───
async function handleDelete(
  db: any,
  wa: { id: string; waba_id: string; access_token: string },
  userId: string,
  body: any
) {
  const { template_id, name } = body;
  if (!template_id || !name) {
    return jsonResp({ error: 'Missing required fields: template_id, name' }, 400);
  }

  // Guard: check if template is referenced by active journeys
  const { data: activeJourneys } = await db
    .from('journeys')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (activeJourneys && activeJourneys.length > 0) {
    const referencingJourneys = activeJourneys.filter((j: any) => {
      const steps = j.steps || (typeof j.steps === 'string' ? JSON.parse(j.steps) : []);
      return Array.isArray(steps) && steps.some((s: any) => s.template_id === name);
    });
    // Also check by template DB name via steps JSON
    const { data: tpl } = await db.from('templates').select('name').eq('id', template_id).maybeSingle();
    const tplName = tpl?.name || name;
    const allRefs = activeJourneys.filter((j: any) => {
      const steps = Array.isArray(j.steps) ? j.steps : [];
      return steps.some((s: any) => s.template_id === name || s.template_id === tplName);
    });
    if (allRefs.length > 0) {
      const journeyNames = allRefs.map((j: any) => j.name).join(', ');
      return jsonResp({
        error: `Cannot delete: template "${name}" is used by ${allRefs.length} active journey(s): ${journeyNames}. Deactivate them first or use 'update' to edit the template in place.`,
        code: 'template_in_use',
        journeys: allRefs.map((j: any) => ({ id: j.id, name: j.name })),
      }, 409);
    }
  }

  // Delete from Meta (by name)
  const metaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wa.waba_id}/message_templates?name=${encodeURIComponent(name)}`;
  const metaRes = await fetch(metaUrl, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${wa.access_token}` },
  });

  if (!metaRes.ok) {
    const metaJson = await metaRes.json();
    const errMsg = metaJson.error?.message || 'Unknown Meta error';
    // If Meta says template not found, still delete from DB
    if (!errMsg.includes('not found')) {
      return jsonResp({ error: `Meta API error: ${errMsg}` }, metaRes.status);
    }
  }

  // Delete from DB
  const { error } = await db
    .from('templates')
    .delete()
    .eq('id', template_id)
    .eq('user_id', userId);

  if (error) {
    return jsonResp({ error: error.message }, 500);
  }

  return jsonResp({ success: true });
}

// ─── UPDATE ───
// Edits an approved template's body/footer/buttons via Meta Graph API.
// Name and category cannot be changed (Meta restriction).
// This avoids the delete+recreate cycle and preserves approval status.
async function handleUpdate(
  db: any,
  wa: { id: string; waba_id: string; access_token: string },
  userId: string,
  body: any
) {
  const { template_id, components } = body;
  if (!template_id || !components) {
    return jsonResp({ error: 'Missing required fields: template_id, components' }, 400);
  }

  // Look up existing template
  const { data: existing, error: lookupErr } = await db
    .from('templates')
    .select('*')
    .eq('id', template_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (lookupErr || !existing) {
    return jsonResp({ error: 'Template not found' }, 404);
  }

  if (!existing.meta_template_id) {
    return jsonResp({ error: 'Template has no Meta ID — it was never submitted. Use create instead.' }, 400);
  }

  // Meta only allows editing templates that are APPROVED, PAUSED, or REJECTED
  const editableStatuses = ['approved', 'paused', 'rejected'];
  if (!editableStatuses.includes(existing.status)) {
    return jsonResp({
      error: `Template status is "${existing.status}" — only approved, paused, or rejected templates can be edited.`,
    }, 400);
  }

  // Submit edit to Meta
  // Meta endpoint: POST /{template_id} with updated components
  const metaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${existing.meta_template_id}`;
  const metaRes = await fetch(metaUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${wa.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      components,
      // Meta may re-review the template after edit
    }),
  });

  const metaJson = await metaRes.json();
  if (!metaRes.ok) {
    const errMsg = metaJson.error?.message || JSON.stringify(metaJson);
    return jsonResp({ error: `Meta API error: ${errMsg}` }, metaRes.status >= 400 ? metaRes.status : 400);
  }

  // Parse updated components for DB columns
  const parsed = parseComponents(components);

  // Update local DB — Meta may change status to PENDING after edit
  const newStatus = metaJson.status ? normStatus(metaJson.status) : existing.status;
  const { data: updated, error: updateErr } = await db
    .from('templates')
    .update({
      components,
      header: parsed.header,
      body_text: parsed.bodyText,
      footer: parsed.footer,
      buttons: parsed.buttons,
      variables: parsed.variables,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', template_id)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateErr) {
    return jsonResp({ error: updateErr.message }, 500);
  }

  return jsonResp({
    success: true,
    template: updated,
    note: newStatus !== existing.status
      ? `Status changed from "${existing.status}" to "${newStatus}" — Meta may re-review after edit.`
      : undefined,
  });
}

// ─── Re-host approved sample media to durable storage ───
async function rehostSample(
  db: any,
  accountId: string,
  metaId: string,
  fmt: string,
  handleUrl: string,
): Promise<string> {
  try {
    const res = await fetch(handleUrl);
    if (!res.ok) return handleUrl; // fallback: raw Meta CDN URL
    const bytes = new Uint8Array(await res.arrayBuffer());
    const ext = fmt === 'IMAGE' ? 'jpg' : fmt === 'VIDEO' ? 'mp4' : 'pdf';
    const path = `${accountId}/${metaId}.${ext}`;
    const contentType =
      fmt === 'IMAGE' ? 'image/jpeg' : fmt === 'VIDEO' ? 'video/mp4' : 'application/pdf';
    const up = await db.storage
      .from('template-samples')
      .upload(path, bytes, { contentType, upsert: true });
    if (up.error) {
      console.warn('[manage-template] rehost upload failed:', up.error.message);
      return handleUrl;
    }
    return db.storage.from('template-samples').getPublicUrl(path).data.publicUrl;
  } catch (e: any) {
    console.warn('[manage-template] rehost error:', e.message);
    return handleUrl;
  }
}

// ─── SYNC ───
async function handleSync(
  db: any,
  wa: { id: string; waba_id: string; access_token: string },
  userId: string
) {
  // Fetch all templates from Meta (paginate)
  const allTemplates: any[] = [];
  let url: string | null = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wa.waba_id}/message_templates?limit=250`;

  while (url) {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${wa.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      return jsonResp({ error: `Meta API error: ${json.error?.message || 'Unknown'}` }, res.status);
    }
    allTemplates.push(...(json.data || []));
    url = json.paging?.next || null;
  }

  const metaIds = new Set<string>();
  let upserted = 0;

  for (const mt of allTemplates) {
    const metaId = String(mt.id);
    metaIds.add(metaId);
    const parsed = parseComponents(mt.components || []);

    // Re-host approved sample media header for a durable URL
    let headerSampleUrl: string | null = null;
    const hc = (mt.components || []).find(
      (c: any) => String(c.type).toUpperCase() === 'HEADER',
    );
    const hfmt = String(hc?.format ?? '').toUpperCase();
    if (
      hc &&
      ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(hfmt) &&
      hc.example?.header_handle?.[0]
    ) {
      headerSampleUrl = await rehostSample(
        db, wa.id, metaId, hfmt, hc.example.header_handle[0],
      );
    }

    const { error } = await db
      .from('templates')
      .upsert(
        {
          user_id: userId,
          whatsapp_account_id: wa.id,
          name: mt.name,
          language: mt.language,
          category: normCategory(mt.category),
          status: normStatus(mt.status),
          meta_template_id: metaId,
          components: mt.components || [],
          header: parsed.header,
          body_text: parsed.bodyText,
          footer: parsed.footer,
          buttons: parsed.buttons,
          variables: parsed.variables,
          header_sample_url: headerSampleUrl,
          rejected_reason: mt.rejected_reason || mt.quality_score?.reasons?.join(', ') || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'meta_template_id' }
      );

    if (error) {
      console.error('[manage-template] template upsert failed:', mt.name, error.message);
    } else {
      upserted++;
    }
  }

  // Mark DB templates not in Meta as 'deleted' — ONLY if they have a meta_template_id
  // (Correction 3: don't touch local drafts with null meta_template_id)
  const { data: dbTemplates } = await db
    .from('templates')
    .select('id, meta_template_id')
    .eq('user_id', userId)
    .not('meta_template_id', 'is', null);

  let deleted = 0;
  if (dbTemplates) {
    for (const row of dbTemplates) {
      if (!metaIds.has(row.meta_template_id)) {
        await db
          .from('templates')
          .update({ status: 'deleted', updated_at: new Date().toISOString() })
          .eq('id', row.id);
        deleted++;
      }
    }
  }

  return jsonResp({ success: true, synced: upserted, deleted });
}

// ─── Helpers ───

function parseComponents(components: any[]): {
  header: any;
  bodyText: string | null;
  footer: string | null;
  buttons: any;
  variables: any;
} {
  let header: any = null;
  let bodyText: string | null = null;
  let footer: string | null = null;
  let buttons: any = null;
  const variables: Record<string, string[]> = {};

  for (const c of (components || [])) {
    switch (c.type?.toUpperCase()) {
      case 'HEADER':
        header = { format: c.format, text: c.text || null };
        if (c.text) {
          const headerVars = c.text.match(/\{\{(\d+)\}\}/g);
          if (headerVars) variables.header = headerVars;
        }
        break;
      case 'BODY':
        bodyText = c.text || null;
        if (c.text) {
          const bodyVars = c.text.match(/\{\{(\d+)\}\}/g);
          if (bodyVars) variables.body = bodyVars;
        }
        break;
      case 'FOOTER':
        footer = c.text || null;
        break;
      case 'BUTTONS':
        buttons = c.buttons || [];
        break;
    }
  }

  return { header, bodyText, footer, buttons, variables };
}

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
