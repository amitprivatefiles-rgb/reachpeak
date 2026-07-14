// Supabase Edge Function: flow-engine
// Chatbot automation engine — matches triggers, walks node graphs,
// sends WhatsApp messages (instant via Graph API), captures answers,
// handles delays, conditions, tagging, and human handoff.
//
// Security: Only callable with service-role key (webhook + pg_cron).
// Deploy: supabase functions deploy flow-engine --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GRAPH_VERSION = Deno.env.get('GRAPH_API_VERSION') ?? 'v25.0';
const MAX_STEPS     = 25;
const OPT_OUT_WORDS = ['stop', 'unsubscribe', 'opt out', 'optout'];

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- Types ----------
type Node = { id: string; type: string; data: Record<string, any> };
type Edge = { id: string; source: string; target: string; sourceHandle?: string | null };
type Def  = { nodes: Node[]; edges: Edge[] };

const nodeById = (d: Def, id?: string | null) => d.nodes.find(n => n.id === id);
const outEdges = (d: Def, id: string) => d.edges.filter(e => e.source === id);
const firstTarget = (d: Def, id: string) => outEdges(d, id)[0]?.target ?? null;
const edgeByHandle = (d: Def, id: string, handle: string) =>
  d.edges.find(e => e.source === id && (e.sourceHandle ?? '') === handle);

function substitute(text: string, vars: Record<string, any>): string {
  return (text ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => String(vars[k] ?? ''));
}

// ---------- WhatsApp Graph API helpers (instant, direct) ----------
async function graphSend(account: any, payload: any) {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${account.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    },
  );
  const json = await res.json();
  return { ok: res.ok, wamid: json?.messages?.[0]?.id ?? null, error: json?.error ?? null };
}

const sendText = (acc: any, to: string, body: string) =>
  graphSend(acc, { to, type: 'text', text: { body } });

const sendButtons = (acc: any, to: string, text: string, buttons: any[]) =>
  graphSend(acc, {
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });

async function sendTemplate(acc: any, to: string, name: string, lang: string, components: any[]) {
  return graphSend(acc, {
    to,
    type: 'template',
    template: { name, language: { code: lang }, components: components ?? [] },
  });
}

// ---------- Persist outbound into messages table (so it shows in Inbox) ----------
async function logOutbound(exec: any, account: any, wamid: string | null, body: string, msgType = 'text') {
  await db.from('messages').insert({
    user_id: exec.user_id,
    whatsapp_account_id: exec.whatsapp_account_id,
    conversation_id: exec.conversation_id,
    wamid,
    direction: 'outbound',
    wa_from: account.phone_number_id,
    wa_to: exec.contact_phone,
    message_type: msgType,
    content: msgType === 'text' ? { text: { body } } : { template: { name: body } },
    status: wamid ? 'sent' : 'failed',
    sent_at: wamid ? new Date().toISOString() : null,
  });

  // Update conversation preview
  await db.from('conversations').update({
    last_message_preview: body.slice(0, 100),
    last_message_at: new Date().toISOString(),
    last_message_direction: 'outbound',
  }).eq('id', exec.conversation_id);
}

const logNode = (exec: any, node: Node, detail: any) =>
  db.from('flow_run_log').insert({
    user_id: exec.user_id,
    execution_id: exec.id,
    flow_id: exec.flow_id,
    node_id: node.id,
    node_type: node.type,
    detail,
  });

// ---------- Tag helper (uses existing tags + contact_tags junction) ----------
async function setTag(exec: any, tagName: string) {
  // Upsert the tag
  const { data: tag } = await db.from('tags')
    .upsert({ user_id: exec.user_id, name: tagName }, { onConflict: 'user_id,name' })
    .select('id')
    .single();
  if (!tag) return;

  // Find contact by phone
  const { data: contact } = await db.from('contacts')
    .select('id')
    .eq('user_id', exec.user_id)
    .eq('phone_number', exec.contact_phone)
    .maybeSingle();
  if (!contact) return;

  // Insert junction (ignore if exists)
  await db.from('contact_tags')
    .upsert(
      { contact_id: contact.id, tag_id: tag.id, user_id: exec.user_id },
      { onConflict: 'contact_id,tag_id' },
    );
}

// ---------- Opt-out helper ----------
async function optOutContact(userId: string, phone: string) {
  await db.from('contacts')
    .update({ is_blacklisted: true })
    .eq('user_id', userId)
    .eq('phone_number', phone);
}

// ---------- Main handler ----------
Deno.serve(async (req: Request) => {
  // Security guard: only service-role callers (webhook + pg_cron)
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${SERVICE_ROLE}`) {
    return new Response('unauthorized', { status: 401 });
  }

  try {
    const { conversation_id, trigger, text, button_id, is_new } = await req.json();
    if (!conversation_id) return new Response('missing conversation_id', { status: 400 });

    // Load conversation + account
    const { data: convo } = await db.from('conversations')
      .select('id, user_id, whatsapp_account_id, contact_phone, window_expires_at')
      .eq('id', conversation_id)
      .single();
    if (!convo) return new Response('no conversation', { status: 404 });

    const { data: account } = await db.from('whatsapp_accounts')
      .select('id, phone_number_id, user_id')
      .eq('id', convo.whatsapp_account_id)
      .single();
    if (!account) return new Response('no account', { status: 404 });

    // Decrypt WABA token from Vault
    const { data: vaultToken } = await db.rpc('get_waba_access_token', { p_account_id: account.id });
    (account as any).access_token = vaultToken ?? '';

    const windowOpen = convo.window_expires_at && new Date(convo.window_expires_at) > new Date();

    // Global opt-out: halt automation + blacklist contact
    if (trigger === 'inbound' && text && OPT_OUT_WORDS.includes(text.trim().toLowerCase())) {
      await db.from('flow_executions')
        .update({ status: 'completed' })
        .eq('conversation_id', conversation_id)
        .in('status', ['running', 'waiting_input', 'waiting_delay']);
      await optOutContact(account.user_id, convo.contact_phone);
      return new Response('opted_out');
    }

    // Find active execution for this conversation
    let { data: exec } = await db.from('flow_executions')
      .select('*')
      .eq('conversation_id', conversation_id)
      .in('status', ['running', 'waiting_input', 'waiting_delay'])
      .maybeSingle();

    // 1) Advance an execution that was WAITING ON INPUT
    if (exec && exec.status === 'waiting_input' && trigger === 'inbound') {
      const { data: flow } = await db.from('flows').select('definition').eq('id', exec.flow_id).single();
      const def: Def = flow!.definition;
      const node = nodeById(def, exec.current_node_id)!;
      let nextId: string | null = null;

      if (node.type === 'question') {
        exec.variables[node.data.variable] = text ?? '';
        nextId = firstTarget(def, node.id);
      } else if (node.type === 'buttons') {
        const chosen = button_id ?? text;
        const e = def.edges.find(ed =>
          ed.source === node.id &&
          (ed.sourceHandle === chosen ||
            (node.data.buttons ?? []).find((b: any) => b.id === ed.sourceHandle && b.title === chosen)),
        );
        nextId = e?.target ?? firstTarget(def, node.id);
      }

      await db.from('flow_executions')
        .update({ variables: exec.variables, current_node_id: nextId, status: 'running' })
        .eq('id', exec.id);
      exec.current_node_id = nextId;
      exec.status = 'running';
      return await runLoop(exec, def, account, windowOpen);
    }

    // 2) Resume a DELAYED execution
    if (exec && exec.status === 'waiting_delay' && trigger === 'resume') {
      const { data: flow } = await db.from('flows').select('definition').eq('id', exec.flow_id).single();
      const def: Def = flow!.definition;
      const nextId = firstTarget(def, exec.current_node_id!);
      await db.from('flow_executions')
        .update({ current_node_id: nextId, status: 'running', resume_at: null })
        .eq('id', exec.id);
      exec.current_node_id = nextId;
      exec.status = 'running';
      return await runLoop(exec, def, account, windowOpen);
    }

    // 3) No active execution + inbound → try to START a matching flow
    if (!exec && trigger === 'inbound') {
      const { data: flows } = await db.from('flows')
        .select('*')
        .eq('user_id', account.user_id)
        .eq('status', 'active')
        .order('priority', { ascending: false });

      const lc = (text ?? '').trim().toLowerCase();
      const match = (flows ?? []).find((f: any) => {
        if (f.trigger_type === 'any_message') return true;
        if (f.trigger_type === 'new_conversation') return !!is_new;
        if (f.trigger_type === 'keyword') {
          const kws: string[] = (f.trigger_config?.keywords ?? []).map((k: string) => k.toLowerCase());
          const exact = f.trigger_config?.match === 'exact';
          return kws.some((k: string) => (exact ? lc === k : lc.includes(k)));
        }
        return false;
      });

      if (!match) return new Response('no matching flow');

      const def: Def = match.definition;
      const triggerNode = def.nodes.find(n => n.type === 'trigger');
      const startId = firstTarget(def, match.entry_node_id ?? triggerNode?.id ?? '');

      const { data: created, error: createErr } = await db.from('flow_executions')
        .insert({
          user_id: account.user_id,
          flow_id: match.id,
          conversation_id,
          whatsapp_account_id: account.id,
          contact_phone: convo.contact_phone,
          current_node_id: startId,
          status: 'running',
          variables: {},
        })
        .select()
        .single();

      if (createErr) {
        // Unique constraint violation → execution already active
        console.log('[flow-engine] Execution already active for conversation', conversation_id);
        return new Response('already_running');
      }

      return await runLoop(created, def, account, windowOpen);
    }

    return new Response('noop');
  } catch (e) {
    console.error('[flow-engine] Error:', (e as Error).message);
    return new Response('error', { status: 500 });
  }
});

// ---------- Run loop: walk nodes until WAIT, HANDOFF, or END ----------
async function runLoop(exec: any, def: Def, account: any, windowOpen: boolean): Promise<Response> {
  let steps = 0;

  while (exec.current_node_id && steps < MAX_STEPS) {
    steps++;
    const node = nodeById(def, exec.current_node_id);
    if (!node) { await finish(exec, 'completed'); break; }

    if (node.type === 'send_message') {
      const body = substitute(node.data.text, exec.variables);
      if (!windowOpen) {
        await logNode(exec, node, { skipped: 'window_closed' });
        await finish(exec, 'failed', '24h window closed — use a template node');
        break;
      }
      const r = await sendText(account, exec.contact_phone, body);
      await logOutbound(exec, account, r.wamid, body);
      await logNode(exec, node, { sent: r.ok, error: r.error });
      exec.current_node_id = firstTarget(def, node.id);

    } else if (node.type === 'send_template') {
      const params = (node.data.body_params ?? [])
        .map((p: string) => ({ type: 'text', text: substitute(p, exec.variables) }));
      const components = params.length ? [{ type: 'body', parameters: params }] : [];
      const r = await sendTemplate(
        account, exec.contact_phone,
        node.data.template_name, node.data.language ?? 'en',
        components,
      );
      await logOutbound(exec, account, r.wamid, node.data.template_name, 'template');
      await logNode(exec, node, { sent: r.ok, error: r.error });
      exec.current_node_id = firstTarget(def, node.id);

    } else if (node.type === 'buttons') {
      if (!windowOpen) {
        await logNode(exec, node, { skipped: 'window_closed' });
        await finish(exec, 'failed', '24h window closed');
        break;
      }
      const body = substitute(node.data.text, exec.variables);
      const r = await sendButtons(account, exec.contact_phone, body, node.data.buttons ?? []);
      await logOutbound(exec, account, r.wamid, body);
      await logNode(exec, node, { sent: r.ok });
      await save(exec, { status: 'waiting_input' });
      return new Response('waiting_input');

    } else if (node.type === 'question') {
      if (!windowOpen) {
        await logNode(exec, node, { skipped: 'window_closed' });
        await finish(exec, 'failed', '24h window closed');
        break;
      }
      const body = substitute(node.data.text, exec.variables);
      const r = await sendText(account, exec.contact_phone, body);
      await logOutbound(exec, account, r.wamid, body);
      await logNode(exec, node, { asked: node.data.variable });
      await save(exec, { status: 'waiting_input' });
      return new Response('waiting_input');

    } else if (node.type === 'condition') {
      const v = exec.variables[node.data.variable];
      const target = String(node.data.value ?? '').toLowerCase();
      let result = false;
      if (node.data.op === 'exists') result = v !== undefined && v !== null && v !== '';
      else if (node.data.op === 'contains') result = String(v ?? '').toLowerCase().includes(target);
      else result = String(v ?? '').toLowerCase() === target; // equals
      await logNode(exec, node, { variable: node.data.variable, value: v, op: node.data.op, result });
      exec.current_node_id = edgeByHandle(def, node.id, result ? 'true' : 'false')?.target ?? null;

    } else if (node.type === 'set_tag') {
      await setTag(exec, node.data.tag);
      await logNode(exec, node, { tag: node.data.tag });
      exec.current_node_id = firstTarget(def, node.id);

    } else if (node.type === 'delay') {
      const minutes = node.data.minutes ?? 1;
      const resume = new Date(Date.now() + minutes * 60_000).toISOString();
      await logNode(exec, node, { delay_minutes: minutes, resume_at: resume });
      await save(exec, { status: 'waiting_delay', resume_at: resume });
      return new Response('waiting_delay');

    } else if (node.type === 'handoff') {
      await logNode(exec, node, { note: node.data.note });
      await db.from('conversations')
        .update({ unread_count: 1 })
        .eq('id', exec.conversation_id);
      await finish(exec, 'handed_off');
      break;

    } else {
      // end node or unknown type
      await finish(exec, 'completed');
      break;
    }

    // Persist cursor + step count between iterations
    await save(exec, {
      current_node_id: exec.current_node_id,
      step_count: (exec.step_count ?? 0) + steps,
    });

    if (!exec.current_node_id) {
      await finish(exec, 'completed');
      break;
    }
  }

  if (steps >= MAX_STEPS) {
    await finish(exec, 'failed', 'max steps exceeded (possible loop)');
  }

  return new Response('done');
}

const save = (exec: any, patch: any) =>
  db.from('flow_executions')
    .update({ ...patch, last_activity_at: new Date().toISOString() })
    .eq('id', exec.id);

const finish = (exec: any, status: string, error?: string) =>
  db.from('flow_executions')
    .update({ status, error: error ?? null, last_activity_at: new Date().toISOString() })
    .eq('id', exec.id);
