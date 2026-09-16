// Supabase Edge Function: ai-conversation
// Handles incoming customer replies for active AI broadcast conversations.
// Uses Groq (Llama 3.1 70B) to generate contextual sales replies.
//
// Deploy:  supabase functions deploy ai-conversation --no-verify-jwt
//
// Called by whatsapp-webhook when an inbound message matches an active ai_conversation.

import { createClient } from 'npm:@supabase/supabase-js@2';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'qwen/qwen3.8-27b';
const MAX_HISTORY = 8; // focused context window to keep response fast & under limits

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── System prompt builder ───────────────────────────────────────────────────
function buildSystemPrompt(
  campaign: any, 
  aiConv: any, 
  storeName = 'Our Store',
  otherCatalog: any[] = []
): string {
  // Only use custom system_prompt if explicitly set and not the legacy default
  if (campaign.system_prompt && !campaign.system_prompt.includes('You are a WhatsApp sales assistant for')) {
    return campaign.system_prompt;
  }

  const products = (campaign.product_context || [])
    .map((p: any) => {
      let lines = [`• ${p.name || p.title}${p.price ? ` — ${p.price.toString().startsWith('₹') ? p.price : `₹${p.price}`}` : ''}`];
      if (p.fabric) lines.push(`  Fabric: ${p.fabric}`);
      if (p.colors && p.colors.length) lines.push(`  Available Colors: ${Array.isArray(p.colors) ? p.colors.join(', ') : p.colors}`);
      if (p.sizes && p.sizes.length) lines.push(`  Available Sizes: ${Array.isArray(p.sizes) ? p.sizes.join(', ') : p.sizes}`);
      if (p.description) lines.push(`  Details: ${p.description.slice(0, 350)}`);
      if (p.buy_url || p.buyUrl) lines.push(`  Direct Link: ${p.buy_url || p.buyUrl}`);
      if (p.image_url) lines.push(`  Photo: ${p.image_url}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const extraCatalogText = (otherCatalog || [])
    .slice(0, 8)
    .map((p: any) => {
      let info = `• ${p.title} (₹${p.price || ''})`;
      if (p.colors && p.colors.length) info += ` | Colors: ${p.colors.slice(0, 5).join(', ')}`;
      if (p.sizes && p.sizes.length) info += ` | Sizes: ${p.sizes.slice(0, 6).join(', ')}`;
      if (p.fabric) info += ` | Fabric: ${p.fabric}`;
      if (p.product_url) info += ` | Link: ${p.product_url}`;
      if (p.image_url) info += ` | Photo: ${p.image_url}`;
      return info;
    })
    .join('\n');

  const orderCtx = aiConv.order_context || {};

  const personalityMap: Record<string, string> = {
    friendly: `Warm, polite, and respectful. Like a trusted, mature boutique advisor in Delhi/Mumbai who knows product craftsmanship and fit inside out. Address with "ji" and "aap".`,
    professional: `Calm, refined, and consultative. Direct, helpful answers without sales pressure.`,
    casual: `Friendly and genuine. Respectful Hinglish without slang or hype.`,
  };

  const goalInstructions: Record<string, string> = {
    feedback_and_upsell: `Check on their last order with genuine warmth ("Bohot khushi hui sunkar ji"). If they enjoyed it, ask if they are looking for anything specific. If negative, empathize first and address their concern directly.`,
    promotion: `Have a natural dialogue first. Understand their requirements or occasion. Mention at most ONE relevant product at a time.`,
    winback: `Warmly reconnect without being salesy. "Hey ji, kaafi time ho gaya tha! Sab theek hai na?" If they reply positively, casually mention that new designs have arrived.`,
  };

  const offerInfo = campaign.offer
    ? `SPECIAL DISCOUNT AVAILABLE: ${campaign.offer.discount_percent}% off with code "${campaign.offer.discount_code}".
CRITICAL RULE: DO NOT mention this discount upfront! Only offer it when the customer says it is expensive, hesitates on price, or is ready to purchase ("Quality premium hai ji, but agar aap abhi try karna chahein toh main aapke liye ${campaign.offer.discount_percent}% off code ${campaign.offer.discount_code} lagwa deta hoon").`
    : '';

  return `You are a real, mature sales advisor at ${storeName} chatting 1-on-1 with a customer on WhatsApp.

YOUR BRAND & STORE:
- Store Name: ${storeName}
- You represent ${storeName}. Only recommend products and services from your store catalog below.

ROLE & DEMEANOR:
- You are polite, mature, respectful, and calm (like an experienced advisor in a boutique).
- You speak natural, clean Hinglish (or pure Hindi/English if the customer prefers).
- Always address the customer with respect ("aap", "ji").
- NEVER sound like a chatbot or an over-excited teenager. 
- ABSOLUTELY BANNED: Western slang like "snag", "chill vibes", "I feel ya", "cop", "peep", "super comfy", "grab it".
- ABSOLUTELY BANNED: Fake corporate empathy like "I completely understand!", "Thank you for reaching out!", "I would be happy to assist!".
- Max 1-2 short sentences per message. WhatsApp messages must be brief and easy to read on mobile.
- Emojis: Maximum 1 subtle emoji per message (😊, 👍, or 🙏). Many messages should have no emojis.

CUSTOMER PROFILE:
- Customer Name: ${aiConv.customer_name || 'Customer'}
${orderCtx.last_order_date ? `- Past Order: ${orderCtx.items || 'items'} on ${orderCtx.last_order_date}` : '- New customer'}
${orderCtx.total_orders ? `- Past Orders: ${orderCtx.total_orders} orders` : ''}

PRIMARY OBJECTIVE:
${goalInstructions[campaign.goal] || goalInstructions.feedback_and_upsell}

PRIMARY PROMOTED PRODUCTS (Lead with these first):
${products || '• Consult store catalog'}

${extraCatalogText ? `OTHER PRODUCTS IN YOUR STORE CATALOG (ONLY recommend these if the customer asks for other options, colors, sizes, or fabrics):
${extraCatalogText}` : ''}

${offerInfo}

COLOR, SIZE & VARIANT INTELLIGENCE:
- If customer asks for a specific COLOR (e.g. "Do you have this in Green/Pink/Teal/Brown?"):
  * Check the available colors for the product or other store items.
  * If available: Confirm politely and share the product link.
  * If that exact color is not in stock: Honestly let them know and suggest the closest available shade or related item.
- If customer asks for a specific SIZE (e.g. "Size 38 available hai?", "XL mil jayega?"):
  * Check the sizes list. If in stock, confirm: "Haan ji, size [SIZE] bilkul available hai."
- If customer asks for FABRIC details:
  * Reference the exact fabric listed (Rayon, Satin, Denim, Genuine Leather, etc.) and explain its real comfort benefit.

SENDING PRODUCT PHOTOS & IMAGES:
- When the customer asks to see the product / photo / picture (e.g. "photo bhejo", "dikhao", "kaisa dikhta hai", "pic bhejo", "look dekhna hai"):
  * Reassure them warmly and attach the exact Photo URL from above using this tag at the very end of your message:
    [IMAGE: <exact_photo_url>]
  * Example: "Yeh raha photo ji, print aur fabric dono bohot pyare hain [IMAGE: https://...]"
  * Only use real Photo URLs from the product list above. Never invent photo URLs.

DOMAIN & CATEGORY CONSULTING INTELLIGENCE:
Adapt your sales expertise dynamically based on the products in your catalog above:
- FOOTWEAR / JUTTIS (e.g. Jutti Express, Punjabi Juttis, Mojaris):
  * Emphasize genuine leather base, double cushioned insoles, and 100% bite-free comfort.
  * If customer asks "jutti kat ti toh nahi hai / pair chhilte hain": Reassure warmly that the leather is soft, pre-treated, and padded with double cushioning so it never bites or pinches.
  * Sizing: Standard Indian/UK sizing; genuine leather naturally relaxes and shapes to foot contours within 1-2 wears.
  * Occasions: Match embroidery (zari, dabka, threadwork) with bridal lehengas, festive suits, or everyday ethnic wear.
- NIGHTWEAR & LOUNGEWEAR (e.g. Princess Nightwear):
  * STRICT RULE: Princess Nightwear does NOT sell pajama sets! NEVER mention "pajama set" or "t-shirt".
  * Store Specialization:
    1. Kaftans (Rayon & Satin): Elegant flowy drape, free-size, very comfortable for lounging or hosting guests at home.
    2. Nightsuits & Co-ord Sets (Rayon, Satin, Denim finish): Stylish 2-piece coordinated sets, presentable for WFH, morning routines, or relaxed weekends.
    3. Denim Nighties: Signature denim look with embroidery detailing, front yoke, and functional pockets.
  * Fabrics:
    - Rayon: Extremely soft, breathable, skin-friendly, best for Indian heat.
    - Satin: Glossy, smooth, silky premium feel, great for gifting or elegant evenings.
    - Denim Lounge: Fashionable outfit look with soft nightwear comfort.
  * Sizing: Kaftans are free-size and flowy; Nightsuits & Co-ord sets are relaxed fit. Mention 7-day hassle-free size exchange if customer is unsure about fit.
- GENERAL APPAREL / D2C:
  * Emphasize fabric quality, stitching, true-to-size fitting, and easy 7-day exchange assurance.
- PRICING OBJECTIONS:
  * Defend quality and craftsmanship first ("Quality aur finish premium hai ji, regular use ke baad bhi kharab nahi hota").
  * Only then offer the discount code if the customer hesitates or asks for discount.
- "BAAD MEIN / SOCHKE BATATA HU":
  * Respect their time immediately without pressure: "Theek hai ji, aap aaram se dekh lijiye. Koi sawal ho toh main yahin hoon 👍"
- GIFTING:
  * "Gift ke liye presentation aur packaging dono bohot decent hain ji. Size ka idea hai aapko?"

STRICT WHATSAPP FORMATTING RULES:
1. NEVER use markdown symbols (no asterisks *, no bold **, no bullet points, no hashes #). Plain WhatsApp text only.
2. Only 1 question at a time. Never overwhelm with multiple questions.
3. Do not push links unless they express interest in seeing the product or buying.
4. Keep the tone human, grounded, and helpful.`;
}

// ─── Detect conversation end signals ─────────────────────────────────────────
function shouldEndConversation(aiReply: string, customerMsg: string): { end: boolean; reason?: string } {
  const lowerCustomer = customerMsg.toLowerCase().trim();
  const lowerReply = aiReply.toLowerCase();

  // Customer opt-out signals (English + Hindi)
  const optOuts = ['stop', 'unsubscribe', 'not interested', 'don\'t message', 'no thanks',
    'band karo', 'nahi chahiye', 'mat bhejo', 'pareshan mat karo', 'block', 'spam',
    'bakwas band karo', 'msg mat karo', 'message mat bhejo', 'disturb mat karo'];
  if (optOuts.some(k => lowerCustomer.includes(k))) {
    return { end: true, reason: 'opted_out' };
  }

  // AI naturally ended the conversation
  if (lowerReply.includes('feel free to reach out') || lowerReply.includes('anytime you need') ||
      lowerReply.includes('take care') || lowerReply.includes('jab bhi zaroorat ho')) {
    return { end: true, reason: 'closed' };
  }

  return { end: false };
}

// ─── Detect sentiment ────────────────────────────────────────────────────────
function detectSentiment(message: string): string {
  const lower = message.toLowerCase();
  const negative = ['angry', 'upset', 'terrible', 'worst', 'horrible', 'scam', 'fraud', 'cheat',
    'damaged', 'broken', 'disgusting', 'waste', 'complaint', 'refund', 'return',
    'bahut bura', 'ghatiya', 'bekaar', 'paisa barbaad', 'dhoka'];
  const positive = ['great', 'love', 'amazing', 'awesome', 'perfect', 'beautiful', 'excellent',
    'comfortable', 'best', 'happy', 'thank', 'superb', 'wonderful',
    'bahut accha', 'bohot sahi', 'maza aa gaya', 'pasand aaya'];

  if (negative.some(k => lower.includes(k))) return 'negative';
  if (positive.some(k => lower.includes(k))) return 'positive';
  return 'neutral';
}

// ─── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const {
      ai_conversation_id,
      customer_message,
      customer_phone,
      conversation_id,
    } = await req.json();

    if (!ai_conversation_id || !customer_message) {
      return json({ error: 'Missing ai_conversation_id or customer_message' }, 400);
    }

    // 1. Load the AI conversation
    const { data: aiConv, error: convErr } = await db
      .from('ai_conversations')
      .select('*, ai_campaigns(*)')
      .eq('id', ai_conversation_id)
      .single();

    if (convErr || !aiConv) return json({ error: 'AI conversation not found' }, 404);

    const campaign = aiConv.ai_campaigns;
    if (!campaign) return json({ error: 'Campaign not found' }, 404);

    // Check if conversation should still be active
    if (!['template_sent', 'active'].includes(aiConv.status)) {
      return json({ ok: true, skipped: true, reason: `conversation status is ${aiConv.status}` });
    }

    // Check max turns
    if (aiConv.message_count >= (campaign.max_turns || 15) * 2) {
      await db.from('ai_conversations').update({ status: 'timed_out' }).eq('id', aiConv.id);
      return json({ ok: true, skipped: true, reason: 'max turns reached' });
    }

    // 2. Check if human agent is active (don't override human conversation)
    if (conversation_id) {
      const { data: conv } = await db
        .from('conversations')
        .select('human_active_until')
        .eq('id', conversation_id)
        .single();

      if (conv?.human_active_until && new Date(conv.human_active_until) > new Date()) {
        return json({ ok: true, skipped: true, reason: 'human agent active' });
      }
    }

    // 3. Load message history for context
    const { data: history } = await db
      .from('ai_messages')
      .select('role, content')
      .eq('ai_conversation_id', aiConv.id)
      .order('created_at', { ascending: true })
      .limit(MAX_HISTORY);

    // Load WhatsApp account early for store identity and outbound message dispatch
    const { data: account } = await db
      .from('whatsapp_accounts')
      .select('id, phone_number_id, display_phone_number, verified_name')
      .eq('user_id', aiConv.user_id)
      .eq('is_active', true)
      .maybeSingle();

    const storeName = account?.verified_name || 'Our Store';

    // Fetch wider store catalog products and sort relevant matches first
    const lowerCustMsg = customer_message.toLowerCase();
    const { data: allCatalog } = await db
      .from('shopify_product_images')
      .select('title, price, product_url, image_url, fabric, colors, sizes, product_type')
      .eq('user_id', aiConv.user_id)
      .limit(30);

    const otherCatalog = (allCatalog || []).sort((a: any, b: any) => {
      const aMatches = lowerCustMsg.split(/\s+/).some((w: string) => w.length > 3 && (a.title || '').toLowerCase().includes(w));
      const bMatches = lowerCustMsg.split(/\s+/).some((w: string) => w.length > 3 && (b.title || '').toLowerCase().includes(w));
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    }).slice(0, 8);

    // 4. Build the messages array for Groq
    const systemPrompt = buildSystemPrompt(campaign, aiConv, storeName, otherCatalog);
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of (history || [])) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add the new customer message
    messages.push({ role: 'user', content: customer_message });

    // 5. Call Groq API
    let groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: (campaign.ai_model && campaign.ai_model.includes('qwen')) ? campaign.ai_model : DEFAULT_MODEL,
        messages,
        max_tokens: 150,
        temperature: 0.4,
        top_p: 0.9,
      }),
    });

    // Automatic fallback if rate-limited on primary model
    if (groqRes.status === 429) {
      console.warn('Groq rate limit hit on primary model, trying fallback openai/gpt-oss-20b');
      groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages,
          max_tokens: 150,
          temperature: 0.4,
        }),
      });
    }

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errBody);
      return json({ error: 'AI model error', detail: errBody }, 502);
    }

    const groqData = await groqRes.json();
    let aiReply = groqData.choices?.[0]?.message?.content?.trim();
    const tokensUsed = groqData.usage?.total_tokens || 0;

    if (!aiReply) {
      return json({ error: 'Empty AI response' }, 502);
    }

    // 5.1 Extract [IMAGE: <url>] if generated by AI
    let imageUrl: string | null = null;
    const imageMatch = aiReply.match(/\[IMAGE:\s*(https?:\/\/[^\s\]]+)\]/i);
    if (imageMatch) {
      imageUrl = imageMatch[1];
      aiReply = aiReply.replace(imageMatch[0], '').trim();
    }

    // Clean up any stray quotes or markdown formatting
    aiReply = aiReply.replace(/^["']|["']$/g, '').replace(/[*_~`]/g, '').trim();

    // 5.2 Smart fallback: If customer asked for a photo/pic/look/dekhna and AI didn't include an image tag
    const photoKeywords = /(photo|pic|picture|image|dikhao|look|dekhna|kaisa dikhta|kaisa lagta|bhejo photo|bhejo pic)/i;
    if (!imageUrl && photoKeywords.test(customer_message)) {
      const campaignProducts = campaign.product_context || [];
      const lowerMsg = customer_message.toLowerCase();

      // Check campaign products first
      const matchedProd = campaignProducts.find((p: any) => {
        if (!p.image_url) return false;
        const pName = (p.name || p.title || '').toLowerCase();
        return lowerMsg.split(/\s+/).some((w: string) => w.length > 3 && pName.includes(w));
      }) || campaignProducts.find((p: any) => p.image_url);

      if (matchedProd?.image_url) {
        imageUrl = matchedProd.image_url;
      } else if (otherCatalog && otherCatalog.length > 0) {
        // Fallback to otherCatalog products
        const matchedCatalog = otherCatalog.find((p: any) => {
          if (!p.image_url) return false;
          const title = (p.title || '').toLowerCase();
          return lowerMsg.split(/\s+/).some((w: string) => w.length > 3 && title.includes(w));
        }) || otherCatalog.find((p: any) => p.image_url);

        if (matchedCatalog?.image_url) {
          imageUrl = matchedCatalog.image_url;
        }
      }
    }

    const isImage = !!imageUrl;
    const previewText = (isImage ? `📷 ${aiReply}` : aiReply).substring(0, 100);

    // 6. Save both messages to ai_messages
    const sentiment = detectSentiment(customer_message);

    await db.from('ai_messages').insert([
      {
        ai_conversation_id: aiConv.id,
        role: 'user',
        content: customer_message,
        tokens_used: 0,
      },
      {
        ai_conversation_id: aiConv.id,
        role: 'assistant',
        content: isImage ? `${aiReply}\n[Image sent: ${imageUrl}]` : aiReply,
        tokens_used: tokensUsed,
      },
    ]);

    // 7. Queue the AI reply as a WhatsApp message
    if (!account) {
      return json({ error: 'No active WhatsApp account' }, 400);
    }

    // Resolve or create conversation for inbox integration
    let convId = conversation_id || aiConv.conversation_id;
    if (!convId) {
      const { data: existingConv } = await db
        .from('conversations')
        .select('id')
        .eq('user_id', aiConv.user_id)
        .eq('contact_phone', customer_phone)
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: newConv } = await db
          .from('conversations')
          .insert({
            user_id: aiConv.user_id,
            contact_phone: customer_phone,
            contact_name: aiConv.customer_name,
            last_message_at: new Date().toISOString(),
            last_message_preview: previewText,
          })
          .select('id')
          .single();
        convId = newConv?.id;
      }

      // Link conversation to ai_conversation
      if (convId) {
        await db.from('ai_conversations').update({ conversation_id: convId }).eq('id', aiConv.id);
      }
    }

    // Insert the outbound message into messages queue
    // The existing send worker will pick it up and deliver via Meta Graph API
    const { data: msgRow, error: msgErr } = await db
      .from('messages')
      .insert({
        user_id: aiConv.user_id,
        whatsapp_account_id: account.id,
        contact_id: aiConv.contact_id,
        conversation_id: convId,
        direction: 'outbound',
        wa_from: account.display_phone_number,
        wa_to: customer_phone,
        message_type: isImage ? 'image' : 'text',
        media_url: imageUrl || null,
        content: isImage
          ? { image: { link: imageUrl, caption: aiReply } }
          : { text: { body: aiReply } },
        status: 'queued',
        // No campaign_id — these are free-form text/image within 24hr window (₹0 cost)
      })
      .select('id')
      .single();

    if (msgErr) {
      console.error('Failed to queue message:', msgErr);
      return json({ error: 'Failed to queue reply', detail: msgErr.message }, 500);
    }

    // 8. Update ai_conversation stats
    const endCheck = shouldEndConversation(aiReply, customer_message);

    const updatePayload: Record<string, unknown> = {
      status: endCheck.end ? (endCheck.reason || 'closed') : 'active',
      message_count: (aiConv.message_count || 0) + 2,
      ai_tokens_used: (aiConv.ai_tokens_used || 0) + tokensUsed,
      last_message_at: new Date().toISOString(),
    };

    if (sentiment !== 'neutral') {
      updatePayload.sentiment = sentiment;
    }

    // Escalate on strong negative sentiment
    if (sentiment === 'negative') {
      updatePayload.status = 'escalated';
      // Send push notification to merchant
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: aiConv.user_id,
          title: '⚠️ AI Broadcast: Unhappy Customer',
          body: `${aiConv.customer_name || customer_phone} seems upset. Check inbox.`,
          url: '/app?page=inbox',
        }),
      }).catch(() => {});
    }

    await db.from('ai_conversations').update(updatePayload).eq('id', aiConv.id);

    // 9. Update campaign aggregate stats
    if (aiConv.status === 'template_sent') {
      // First reply — increment total_replied
      await db.from('ai_campaigns')
        .update({ total_replied: (campaign.total_replied || 0) + 1 })
        .eq('id', campaign.id);
    }

    // Update total tokens
    db.from('ai_campaigns')
      .update({ total_ai_tokens: (campaign.total_ai_tokens || 0) + tokensUsed })
      .eq('id', campaign.id)
      .then(() => {});

    // Update conversation preview in inbox
    if (convId) {
      db.from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: previewText,
        })
        .eq('id', convId)
        .then(() => {});
    }

    return json({
      ok: true,
      ai_reply: aiReply,
      image_url: imageUrl || null,
      message_type: isImage ? 'image' : 'text',
      tokens_used: tokensUsed,
      sentiment,
      conversation_ended: endCheck.end,
      message_id: msgRow?.id,
    });

  } catch (err) {
    console.error('ai-conversation error:', err);
    return json({ error: 'Internal error', detail: String(err) }, 500);
  }
});
