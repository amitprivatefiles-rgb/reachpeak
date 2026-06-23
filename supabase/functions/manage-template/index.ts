import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH_API_VERSION = Deno.env.get('GRAPH_API_VERSION') || 'v23.0';

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
      .select('id, waba_id, access_token, phone_number_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (waErr || !waAccount) {
      return jsonResp({ error: 'No active WhatsApp account found. Connect one in Settings → WhatsApp.' }, 400);
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create':
        return await handleCreate(serviceClient, waAccount, user.id, body);
      case 'delete':
        return await handleDelete(serviceClient, waAccount, user.id, body);
      case 'sync':
        return await handleSync(serviceClient, waAccount, user.id);
      default:
        return jsonResp({ error: `Unknown action: ${action}` }, 400);
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

// ─── DELETE ───
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
