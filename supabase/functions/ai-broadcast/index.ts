// Supabase Edge Function: ai-broadcast
// Creates and manages AI conversational broadcast campaigns.
// Handles: create, launch, pause, resume, stats
//
// Deploy:  supabase functions deploy ai-broadcast --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildTemplateSendComponents } from '../_shared/templatePayload.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length === 10 ? '91' + digits : digits;
}

// ─── Build system prompt from campaign config ────────────────────────────────
function generateSystemPrompt(campaign: any, storeName: string): string {
  const products = (campaign.product_context || [])
    .map((p: any) => `• ${p.name}${p.price ? ` — ₹${p.price}` : ''}\n  ${p.description || ''}\n  Link: ${p.buy_url || ''}`)
    .join('\n');

  const personality: Record<string, string> = {
    friendly: `Warm, polite, and respectful. Like a trusted, mature boutique advisor in Delhi/Mumbai who knows fabric and fit inside out. Address with "ji" and "aap".`,
    professional: `Calm, refined, and consultative. Direct, helpful answers without sales pressure.`,
    casual: `Friendly and genuine. Respectful Hinglish without slang or hype.`,
  };

  const goalInstructions: Record<string, string> = {
    feedback_and_upsell: `Check on their last order with genuine warmth ("Bohot khushi hui sunkar ji"). If they enjoyed it, ask if they are looking for anything specific (like daily summer wear or a new print). If negative, empathize first and address their concern directly.`,
    promotion: `Have a natural dialogue first. Understand if they need sleepwear for daily wear, lounge, or gifting. Mention at most ONE relevant product at a time.`,
    winback: `Warmly reconnect without being salesy. "Hey ji, kaafi time ho gaya tha! Sab theek hai na?" If they reply positively, casually mention that new soft prints have arrived.`,
  };

  const offerInfo = campaign.offer
    ? `SPECIAL DISCOUNT AVAILABLE: ${campaign.offer.discount_percent}% off with code "${campaign.offer.discount_code}".
CRITICAL RULE: DO NOT mention this discount upfront! Only offer it when the customer says it is expensive, hesitates on price, or is ready to purchase.`
    : '';

  return `You are a real, mature sales advisor at ${storeName} chatting 1-on-1 with a customer on WhatsApp.

ROLE & DEMEANOR:
- You are polite, mature, respectful, and calm.
- You speak natural, clean Hinglish (or Hindi/English matching customer preference).
- Always address the customer with respect ("aap", "ji").
- NEVER sound like a chatbot or an over-excited teenager.
- ABSOLUTELY BANNED: Western slang ("snag", "chill vibes", "I feel ya", "cop", "peep", "super comfy", "grab it").
- ABSOLUTELY BANNED: Fake corporate empathy ("I completely understand!", "Thank you for reaching out!").
- Max 1-2 short sentences per message. WhatsApp messages must be brief and easy to read on mobile.
- Emojis: Maximum 1 subtle emoji per message (😊, 👍, or 🙏). Many messages should have no emojis.

PRIMARY OBJECTIVE:
${goalInstructions[campaign.goal] || goalInstructions.feedback_and_upsell}

AVAILABLE PRODUCTS (only recommend from here):
${products || '• Premium Cotton & Modal Nightwear Sets'}

${offerInfo}

DOMAIN & CATEGORY CONSULTING INTELLIGENCE:
- If selling Juttis / Footwear (e.g. Jutti Express):
  * Emphasize genuine leather base, double cushioned insoles, 100% bite-free comfort.
  * Reassure that soft pre-treated leather never bites or pinches. Standard Indian/UK sizing.
- If selling Nightwear & Loungewear (e.g. Princess Nightwear):
  * STRICT: Princess Nightwear does NOT sell pajama sets or t-shirts. NEVER mention them.
  * Categories: Kaftans (Rayon & Satin), Nightsuits & Co-ord Sets (Rayon, Satin, Denim finish), and Denim Nighties with pockets.
  * Fabrics: Rayon (breathable, flowy, cool), Satin (silky, glossy, elegant), Denim lounge (stylish look with nightwear comfort).
  * Sizing: Kaftans are free-size; nightsuits & co-ords are relaxed fit. Easy 7-day exchange available.
- Pricing: Defend quality and craftsmanship first before offering discount.
- "Baad mein / Sochke batata hu": "Theek hai ji, aap aaram se dekh lijiye. Koi sawal ho toh main yahin hoon 👍"

STRICT WHATSAPP FORMATTING RULES:
1. NEVER use markdown symbols (no asterisks *, no bold **, no bullet points, no hashes #). Plain WhatsApp text only.
2. Only 1 question at a time.
3. Do not push links unless they express interest.
4. Keep the tone human, grounded, and helpful.`;
}

// ─── Audience resolution (reuse logic from enqueue-campaign) ─────────────────
async function resolveAudience(
  db: any,
  userId: string,
  filters: any,
): Promise<Array<{ id: string; phone_number: string; name: string | null }>> {
  const type = filters.type || 'all';

  // Manual mode: contacts may not exist in DB yet — upsert them
  if (type === 'manual') {
    const manualContacts = filters.contacts || [];
    const manualPhones = filters.phones || manualContacts.map((c: any) => c.phone);
    if (manualPhones.length === 0) return [];

    const normalized = manualPhones.map(normalizePhone);
    const nameMap: Record<string, string> = {};
    manualContacts.forEach((c: any) => {
      if (c.name && c.phone) nameMap[normalizePhone(c.phone)] = c.name;
    });

    // Check which contacts already exist
    const { data: existing } = await db
      .from('contacts')
      .select('id, phone_number, name')
      .eq('user_id', userId)
      .in('phone_number', normalized);

    const existingPhones = new Set((existing || []).map((c: any) => c.phone_number));
    const result: Array<{ id: string; phone_number: string; name: string | null }> = [];

    // Update names for existing contacts if we have a name and they don't
    for (const c of (existing || [])) {
      const newName = nameMap[c.phone_number];
      if (newName && !c.name) {
        await db.from('contacts').update({ name: newName }).eq('id', c.id);
        result.push({ id: c.id, phone_number: c.phone_number, name: newName });
      } else {
        result.push({ id: c.id, phone_number: c.phone_number, name: c.name || newName || null });
      }
    }

    // Create contacts that don't exist yet
    const newContacts = normalized
      .filter(p => !existingPhones.has(p))
      .map(p => ({
        user_id: userId,
        phone_number: p,
        name: nameMap[p] || null,
        source: 'ai_broadcast',
        is_blacklisted: false,
      }));

    if (newContacts.length > 0) {
      const { data: inserted } = await db
        .from('contacts')
        .insert(newContacts)
        .select('id, phone_number, name');
      result.push(...(inserted || []));
    }

    return result;
  }

  // DB-based audience modes
  let query = db
    .from('contacts')
    .select('id, phone_number, name')
    .eq('user_id', userId)
    .eq('is_blacklisted', false);

  if (type === 'tag' && (filters.tag_id || filters.tags)) {
    // Support both single tag_id and array of tag names
    if (filters.tags && Array.isArray(filters.tags)) {
      // Get tag IDs from names
      const { data: tagRows } = await db
        .from('tags')
        .select('id')
        .eq('user_id', userId)
        .in('name', filters.tags);
      const tagIds = (tagRows || []).map((t: any) => t.id);
      if (tagIds.length === 0) return [];
      const { data: tagged } = await db
        .from('contact_tags')
        .select('contact_id')
        .in('tag_id', tagIds);
      const ids = [...new Set((tagged || []).map((t: any) => t.contact_id))];
      if (ids.length === 0) return [];
      query = query.in('id', ids);
    } else {
      const { data: tagged } = await db
        .from('contact_tags')
        .select('contact_id')
        .eq('tag_id', filters.tag_id);
      const ids = (tagged || []).map((t: any) => t.contact_id);
      if (ids.length === 0) return [];
      query = query.in('id', ids);
    }
  } else if (type === 'source' && filters.source) {
    query = query.eq('source', filters.source);
  }

  const { data, error } = await query.limit(10000);
  if (error) throw new Error('Audience resolution failed: ' + error.message);
  return data || [];
}

// ─── Load order context for a contact ────────────────────────────────────────
async function loadOrderContext(db: any, userId: string, contactPhone: string): Promise<any> {
  const { data: orders } = await db
    .from('orders')
    .select('id, external_order_id, total, line_items, created_at, status, payment_method')
    .eq('user_id', userId)
    .eq('customer_phone', contactPhone)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!orders || orders.length === 0) return {};

  const lastOrder = orders[0];
  const items = (lastOrder.line_items || [])
    .map((li: any) => li.title || li.name)
    .filter(Boolean)
    .join(', ');

  return {
    last_order_id: lastOrder.external_order_id || lastOrder.id,
    last_order_date: new Date(lastOrder.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    }),
    last_order_total: lastOrder.total,
    items: items || 'items',
    total_orders: orders.length,
    total_spent: orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0),
  };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authorization required' }, 401);
    const { data: { user }, error: authErr } =
      await db.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const action = body.action;

    // ── CREATE ──────────────────────────────────────────────────────────────
    if (action === 'create') {
      const c = body.campaign;
      if (!c?.name) return json({ error: 'Campaign name required' }, 400);
      if (!c?.product_context?.length && !c?.product_ids?.length) {
        return json({ error: 'At least one product required' }, 400);
      }

      // If product_ids provided, load product details from catalogue
      let productContext = c.product_context || [];
      if (c.product_ids?.length && productContext.length === 0) {
        const { data: products } = await db
          .from('shopify_product_images')
          .select('product_id, title, image_url')
          .eq('user_id', user.id)
          .in('product_id', c.product_ids);

        productContext = (products || []).map((p: any) => ({
          id: p.product_id,
          name: p.title,
          image_url: p.image_url,
          price: c.product_prices?.[p.product_id] || '',
          description: c.product_descriptions?.[p.product_id] || '',
          buy_url: c.product_urls?.[p.product_id] || '',
        }));
      }

      // Get store name for system prompt
      const { data: profile } = await db
        .from('profiles')
        .select('business_name')
        .eq('id', user.id)
        .single();
      const storeName = profile?.business_name || 'Our Store';

      const campaignData = {
        user_id: user.id,
        name: c.name,
        goal: c.goal || 'feedback_and_upsell',
        ai_model: c.ai_model || 'qwen/qwen3.8-27b',
        ai_personality: c.ai_personality || 'friendly',
        language: c.language || 'hinglish',
        product_context: productContext,
        audience_filters: c.audience || {},
        opening_template_id: c.opening_template_id || null,
        offer: c.offer || null,
        schedule: c.schedule || {},
        max_turns: c.max_turns || 15,
        status: 'draft',
      };

      // Generate system prompt
      (campaignData as any).system_prompt = generateSystemPrompt(campaignData, storeName);

      const { data: campaign, error: insertErr } = await db
        .from('ai_campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (insertErr) return json({ error: 'Failed to create campaign', detail: insertErr.message }, 500);
      return json({ ok: true, campaign });
    }

    // ── LAUNCH ──────────────────────────────────────────────────────────────
    if (action === 'launch') {
      const campaignId = body.campaign_id;
      if (!campaignId) return json({ error: 'campaign_id required' }, 400);

      // Load campaign
      const { data: campaign, error: campErr } = await db
        .from('ai_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .single();

      if (campErr || !campaign) return json({ error: 'Campaign not found' }, 404);
      if (campaign.status !== 'draft') return json({ error: `Campaign is ${campaign.status}, not draft` }, 400);

      // Load opening template
      let template: any = null;
      if (campaign.opening_template_id) {
        const { data: tpl } = await db
          .from('templates')
          .select('*')
          .eq('id', campaign.opening_template_id)
          .single();
        template = tpl;
        if (!template) return json({ error: 'Opening template not found' }, 400);
        if (template.status !== 'approved' && template.status !== 'APPROVED') {
          return json({ error: 'Opening template not approved by Meta' }, 400);
        }
      }

      // Load WhatsApp account
      const { data: account } = await db
        .from('whatsapp_accounts')
        .select('id, phone_number_id, display_phone_number')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!account) return json({ error: 'No active WhatsApp account' }, 400);

      // Resolve audience
      const contacts = await resolveAudience(db, user.id, campaign.audience_filters);
      if (contacts.length === 0) return json({ error: 'No contacts match the audience filters' }, 400);

      // Create ai_conversations and queue opening messages
      const staggerMinutes = campaign.schedule?.stagger_minutes || 1;
      let queued = 0;
      const batchSize = 50;

      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        const convInserts: any[] = [];
        const msgInserts: any[] = [];

        for (let j = 0; j < batch.length; j++) {
          const contact = batch[j];
          const phone = normalizePhone(contact.phone_number);

          // Load order context
          const orderCtx = await loadOrderContext(db, user.id, phone);

          const aiConvId = crypto.randomUUID();

          // Upsert conversation for inbox
          let convId: string | null = null;
          const { data: existingConv } = await db
            .from('conversations')
            .select('id')
            .eq('user_id', user.id)
            .eq('contact_phone', phone)
            .maybeSingle();

          if (existingConv) {
            convId = existingConv.id;
          } else {
            const { data: newConv } = await db
              .from('conversations')
              .insert({
                user_id: user.id,
                contact_phone: phone,
                contact_name: contact.name,
                last_message_at: new Date().toISOString(),
                is_open: true,
              })
              .select('id')
              .single();
            convId = newConv?.id || null;
          }

          convInserts.push({
            id: aiConvId,
            campaign_id: campaignId,
            user_id: user.id,
            contact_id: contact.id,
            conversation_id: convId,
            customer_phone: phone,
            customer_name: contact.name,
            status: 'pending',
            order_context: orderCtx,
          });

          // Build message payload
          if (template) {
            // Use the approved template for opening message
            const bodyVars = [];
            // Bind {{1}} to customer name (common pattern)
            if (contact.name) bodyVars.push(contact.name);

            const components = buildTemplateSendComponents(template, {
              bodyParams: bodyVars,
            });

            msgInserts.push({
              user_id: user.id,
              whatsapp_account_id: account.id,
              contact_id: contact.id,
              conversation_id: convId,
              direction: 'outbound',
              wa_from: account.display_phone_number,
              wa_to: phone,
              message_type: 'template',
              template_name: template.name,
              content: {
                template: {
                  name: template.name,
                  language: { code: template.language || 'en' },
                  components,
                },
              },
              status: 'queued',
            });
          } else {
            // No template — send a simple text greeting
            // Note: This only works if there's an open 24hr window
            const greeting = campaign.goal === 'winback'
              ? `Hey ${contact.name || 'there'}! 👋 Long time! We've got some amazing new arrivals and would love to show you. Interested?`
              : `Hey ${contact.name || 'there'}! 👋 Thanks for your recent order! How are you liking it? We'd love to hear your feedback 😊`;

            msgInserts.push({
              user_id: user.id,
              whatsapp_account_id: account.id,
              contact_id: contact.id,
              conversation_id: convId,
              direction: 'outbound',
              wa_from: account.display_phone_number,
              wa_to: phone,
              message_type: 'text',
              content: { text: { body: greeting } },
              status: 'queued',
            });
          }
        }

        // Insert ai_conversations batch
        if (convInserts.length > 0) {
          const { error: convErr } = await db.from('ai_conversations').insert(convInserts);
          if (convErr) throw new Error('Failed to create AI conversations: ' + convErr.message);
        }

        // Insert messages batch
        if (msgInserts.length > 0) {
          const { error: msgErr } = await db.from('messages').insert(msgInserts);
          if (msgErr) throw new Error('Failed to queue messages: ' + msgErr.message);
        }

        queued += batch.length;
      }

      // Update campaign status
      await db.from('ai_campaigns').update({
        status: 'running',
        started_at: new Date().toISOString(),
        total_contacts: contacts.length,
      }).eq('id', campaignId);

      // Mark all ai_conversations as template_sent
      await db.from('ai_conversations')
        .update({ status: 'template_sent' })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

      return json({
        ok: true,
        contacts_queued: queued,
        total_contacts: contacts.length,
      });
    }

    // ── PAUSE ───────────────────────────────────────────────────────────────
    if (action === 'pause') {
      await db.from('ai_campaigns')
        .update({ status: 'paused' })
        .eq('id', body.campaign_id)
        .eq('user_id', user.id);
      return json({ ok: true });
    }

    // ── RESUME ──────────────────────────────────────────────────────────────
    if (action === 'resume') {
      await db.from('ai_campaigns')
        .update({ status: 'running' })
        .eq('id', body.campaign_id)
        .eq('user_id', user.id);
      return json({ ok: true });
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const campaignId = body.campaign_id;
      if (!campaignId) return json({ error: 'campaign_id required' }, 400);

      // Get AI conversation IDs first
      const { data: aiConvIds } = await db.from('ai_conversations')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);
      const ids = (aiConvIds || []).map((c: any) => c.id);

      // Delete AI messages for these conversations
      if (ids.length > 0) {
        await db.from('ai_messages').delete().in('ai_conversation_id', ids);
      }

      // Delete AI conversations
      await db.from('ai_conversations')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);

      // Delete the campaign
      const { error: delErr } = await db.from('ai_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', user.id);

      if (delErr) return json({ error: 'Failed to delete: ' + delErr.message }, 500);
      return json({ ok: true });
    }

    // ── STATS ───────────────────────────────────────────────────────────────
    if (action === 'stats') {
      const campaignId = body.campaign_id;

      const { data: campaign } = await db
        .from('ai_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .single();

      if (!campaign) return json({ error: 'Campaign not found' }, 404);

      // Get conversation stats
      const { data: convStats } = await db
        .from('ai_conversations')
        .select('status, sentiment')
        .eq('campaign_id', campaignId);

      const stats = {
        campaign,
        conversations: {
          total: convStats?.length || 0,
          pending: convStats?.filter((c: any) => c.status === 'pending').length || 0,
          template_sent: convStats?.filter((c: any) => c.status === 'template_sent').length || 0,
          active: convStats?.filter((c: any) => c.status === 'active').length || 0,
          converted: convStats?.filter((c: any) => c.status === 'converted').length || 0,
          closed: convStats?.filter((c: any) => c.status === 'closed').length || 0,
          escalated: convStats?.filter((c: any) => c.status === 'escalated').length || 0,
          opted_out: convStats?.filter((c: any) => c.status === 'opted_out').length || 0,
        },
        sentiment: {
          positive: convStats?.filter((c: any) => c.sentiment === 'positive').length || 0,
          neutral: convStats?.filter((c: any) => c.sentiment === 'neutral').length || 0,
          negative: convStats?.filter((c: any) => c.sentiment === 'negative').length || 0,
        },
        response_rate: campaign.total_contacts > 0
          ? ((campaign.total_replied / campaign.total_contacts) * 100).toFixed(1)
          : '0',
      };

      return json(stats);
    }

    // ── LIST ────────────────────────────────────────────────────────────────
    if (action === 'list' || req.method === 'GET') {
      const { data: campaigns } = await db
        .from('ai_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      return json({ campaigns: campaigns || [] });
    }

    return json({ error: 'Unknown action' }, 400);

  } catch (err) {
    console.error('ai-broadcast error:', err);
    return json({ error: 'Internal error', detail: String(err) }, 500);
  }
});
