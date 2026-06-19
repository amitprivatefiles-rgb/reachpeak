const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v23.0';
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

// ---------- Token-bucket rate limiter (per phone_number_id) ----------
interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();
const RATE_LIMIT = 80; // tokens per second

function acquireToken(phoneNumberId: string): number {
  const now = Date.now();
  let bucket = buckets.get(phoneNumberId);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT, lastRefill: now };
    buckets.set(phoneNumberId, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(RATE_LIMIT, bucket.tokens + elapsed * RATE_LIMIT);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return 0; // No wait needed
  }

  // Return ms to wait until 1 token is available
  return Math.ceil((1 - bucket.tokens) / RATE_LIMIT * 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Send a single WhatsApp message ----------
export interface SendResult {
  success: boolean;
  wamid?: string;
  errorCode?: string;
  errorMessage?: string;
}

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  waTo: string,
  messageType: string,
  content: any
): Promise<SendResult> {
  // Rate limit
  const waitMs = acquireToken(phoneNumberId);
  if (waitMs > 0) await sleep(waitMs);

  // Build Graph API body
  const body: any = {
    messaging_product: 'whatsapp',
    to: waTo,
    type: messageType || 'template',
  };

  if (messageType === 'text' && content?.text) {
    body.text = content.text;
  } else if (content?.template) {
    body.template = content.template;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (res.ok && json.messages?.[0]?.id) {
        return { success: true, wamid: json.messages[0].id };
      }

      const errCode = json.error?.code?.toString() || res.status.toString();
      const errMsg = json.error?.message || JSON.stringify(json);

      // Throughput exceeded — back off and retry
      if (errCode === '130429' && attempt < MAX_RETRIES) {
        const backoff = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.warn(`[Send] 130429 throttle, retry ${attempt}/${MAX_RETRIES} after ${backoff}ms`);
        await sleep(backoff);
        continue;
      }

      return { success: false, errorCode: errCode, errorMessage: errMsg };
    } catch (err: any) {
      if (attempt < MAX_RETRIES) {
        const backoff = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[Send] Network error, retry ${attempt}/${MAX_RETRIES} after ${backoff}ms:`, err.message);
        await sleep(backoff);
        continue;
      }
      return { success: false, errorCode: 'NETWORK_ERROR', errorMessage: err.message };
    }
  }

  return { success: false, errorCode: 'MAX_RETRIES', errorMessage: 'Exhausted retries' };
}
