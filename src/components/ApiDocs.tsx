import { useState } from 'react';
import { Copy, Check, ChevronDown, Send, Zap, Key, Shield, Clock, AlertTriangle, BookOpen } from 'lucide-react';

const BASE_URL = 'https://mxupzmwznkekdjylaztl.supabase.co/functions/v1';
const SEND_URL = `${BASE_URL}/partner-send`;
const INGEST_URL = `${BASE_URL}/ingest-event`;

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-lg border border-gray-700 bg-gray-800 p-4 mt-2">
      <CopyBtn text={code} />
      <pre className="overflow-x-auto text-xs leading-relaxed text-gray-300 pr-8">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({ id, title, icon: Icon, children, defaultOpen = false }: {
  id: string; title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Icon className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-gray-800 p-5 space-y-4">{children}</div>}
    </section>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5">
      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">{method}</span>
      <code className="text-sm font-mono text-gray-300 break-all">{path}</code>
      <CopyBtn text={path} />
    </div>
  );
}

function ParamTable({ params }: { params: { name: string; type: string; required: boolean; desc: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-xs uppercase tracking-wider text-gray-500">
            <th className="pb-2 pr-4 text-left">Parameter</th>
            <th className="pb-2 pr-4 text-left">Type</th>
            <th className="pb-2 pr-4 text-left">Required</th>
            <th className="pb-2 text-left">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {params.map(p => (
            <tr key={p.name}>
              <td className="py-2 pr-4"><code className="text-emerald-400 text-xs font-mono">{p.name}</code></td>
              <td className="py-2 pr-4 text-gray-400 text-xs">{p.type}</td>
              <td className="py-2 pr-4">
                {p.required
                  ? <span className="text-xs text-red-400 font-medium">Required</span>
                  : <span className="text-xs text-gray-500">Optional</span>}
              </td>
              <td className="py-2 text-gray-300 text-xs">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseBlock({ status, body }: { status: number; body: string }) {
  const isError = status >= 400;
  return (
    <div className={`rounded-lg border p-3 mt-2 ${isError ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold ${isError ? 'text-red-400' : 'text-emerald-400'}`}>{status}</span>
        <span className="text-xs text-gray-500">{isError ? 'Error' : 'Success'}</span>
      </div>
      <pre className="overflow-x-auto text-xs text-gray-300"><code>{body}</code></pre>
    </div>
  );
}

export function ApiDocs() {
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <BookOpen className="h-7 w-7 text-emerald-400" />
            API Documentation
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Send WhatsApp messages and ingest store events from any platform using the ReachPeak API.
          </p>
        </div>

        {/* Quick Start */}
        <Section id="quickstart" title="Quick Start" icon={Key} defaultOpen={true}>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">1. Get your API Key</h3>
              <p className="text-sm text-gray-400">
                Go to <strong className="text-gray-300">Integrations → Create Key</strong> to generate an API key.
                Your key starts with <code className="text-emerald-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">rpk_live_</code> and
                is shown only once — copy it immediately.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">2. Authentication</h3>
              <p className="text-sm text-gray-400 mb-2">
                Pass your API key in the <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">Authorization</code> header:
              </p>
              <CodeBlock code={`Authorization: Bearer rpk_live_YOUR_API_KEY`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">3. Base URL</h3>
              <div className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 flex items-center gap-2">
                <code className="text-sm font-mono text-emerald-400 break-all">{BASE_URL}</code>
                <CopyBtn text={BASE_URL} />
              </div>
            </div>
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-300">
                  <strong>Rate Limit:</strong> 600 requests per minute per API key.
                  Exceeding this returns <code className="bg-gray-800 px-1 rounded">429 Too Many Requests</code>.
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ─── SEND MESSAGE API ─── */}
        <Section id="send-message" title="Send Message API" icon={Send}>
          <div className="space-y-5">
            <div>
              <p className="text-sm text-gray-400 mb-3">
                Send WhatsApp messages to any phone number. Supports templates, free-text (within 24h window), images, and documents.
              </p>
              <Endpoint method="POST" path={SEND_URL} />
            </div>

            {/* Request params */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Request Body</h3>
              <ParamTable params={[
                { name: 'to', type: 'string', required: true, desc: 'Recipient phone number (with or without country code; 10-digit Indian numbers auto-prefixed with 91)' },
                { name: 'idempotency_key', type: 'string', required: true, desc: 'Unique key to prevent duplicate sends. Use your order ID, event ID, or UUID.' },
                { name: 'type', type: 'string', required: false, desc: '"template" (default), "text", "image", or "document"' },
                { name: 'template', type: 'object', required: false, desc: 'Required when type is "template". See template object below.' },
                { name: 'template.name', type: 'string', required: false, desc: 'Template name exactly as registered in Meta (e.g. "order_confirmed_v2")' },
                { name: 'template.language', type: 'string', required: false, desc: 'Language code (default: "en_US")' },
                { name: 'template.bodyParams', type: 'string[]', required: false, desc: 'Body variable values in order: ["Priya", "ORD-1234", "₹1,499"]' },
                { name: 'template.headerMedia', type: 'string', required: false, desc: 'URL for image/video/document header (if template has media header)' },
                { name: 'template.headerTextParams', type: 'string[]', required: false, desc: 'Text header variable values (if template has text header with {{n}})' },
                { name: 'template.buttonParams', type: 'object[]', required: false, desc: 'Dynamic button parameters (for URL buttons with {{1}} suffix)' },
                { name: 'text', type: 'string', required: false, desc: 'Message body text. Required when type is "text". Only works within 24h service window.' },
                { name: 'media_url', type: 'string', required: false, desc: 'Public URL of the media file. Required for "image" and "document" types.' },
                { name: 'caption', type: 'string', required: false, desc: 'Caption for image or document messages.' },
                { name: 'filename', type: 'string', required: false, desc: 'Display filename for document messages.' },
                { name: 'contact', type: 'object', required: false, desc: '{ "name": "Priya" } — auto-creates or updates contact in your contact list.' },
                { name: 'external_ref', type: 'object', required: false, desc: '{ "type": "order", "id": "ORD-123", "store_ref": "my-store" } — links message to an external record.' },
                { name: 'dry_run', type: 'boolean', required: false, desc: 'If true, validates everything but does NOT send. Great for testing.' },
              ]} />
            </div>

            {/* Example: Template */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Example: Send a Template Message</h3>
              <CodeBlock code={`curl -X POST '${SEND_URL}' \\
  -H 'Authorization: Bearer rpk_live_YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "to": "+91 98765 43210",
  "type": "template",
  "idempotency_key": "order_1234_confirm",
  "template": {
    "name": "order_confirmed_v2",
    "language": "en_US",
    "bodyParams": ["Priya", "#1234", "₹1,499"]
  },
  "contact": {
    "name": "Priya"
  }
}'`} />
              <ResponseBlock status={201} body={`{
  "queued": true,
  "message_id": "a1b2c3d4-...",
  "idempotency_key": "order_1234_confirm"
}`} />
            </div>

            {/* Example: Text */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Example: Send a Text Message</h3>
              <p className="text-xs text-yellow-400 mb-2">⚠️ Text messages only work if the contact messaged you within the last 24 hours (WhatsApp service window).</p>
              <CodeBlock code={`curl -X POST '${SEND_URL}' \\
  -H 'Authorization: Bearer rpk_live_YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "to": "9876543210",
  "type": "text",
  "idempotency_key": "reply_ticket_456",
  "text": "Hi! Your support ticket has been resolved. Let us know if you need anything else."
}'`} />
            </div>

            {/* Example: Image */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Example: Send an Image</h3>
              <CodeBlock code={`curl -X POST '${SEND_URL}' \\
  -H 'Authorization: Bearer rpk_live_YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "to": "9876543210",
  "type": "image",
  "idempotency_key": "promo_img_789",
  "media_url": "https://yourstore.com/images/sale-banner.jpg",
  "caption": "🎉 Flash Sale — 50% off everything!"
}'`} />
            </div>

            {/* Example: Dry Run */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Example: Dry Run (Test Without Sending)</h3>
              <CodeBlock code={`curl -X POST '${SEND_URL}' \\
  -H 'Authorization: Bearer rpk_live_YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "to": "9876543210",
  "type": "template",
  "idempotency_key": "test_dry_001",
  "template": { "name": "order_confirmed_v2", "bodyParams": ["Test", "#0000", "₹0"] },
  "dry_run": true
}'`} />
              <ResponseBlock status={200} body={`{
  "queued": false,
  "dry_run": true,
  "message_id": "...",
  "idempotency_key": "test_dry_001",
  "validation": "passed"
}`} />
            </div>

            {/* Success / Error responses */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Response Codes</h3>
              <div className="space-y-2">
                <ResponseBlock status={201} body={`{ "queued": true, "message_id": "uuid", "idempotency_key": "..." }`} />
                <ResponseBlock status={409} body={`{ "queued": false, "message_id": "uuid", "code": "idempotency_hit" }
// Same idempotency_key already used — message NOT re-sent (safe to retry)`} />
                <ResponseBlock status={401} body={`{ "error": "Invalid or inactive API key", "code": "invalid_api_key" }`} />
                <ResponseBlock status={422} body={`{ "error": "Template \"xyz\" not found", "code": "template_not_found" }
{ "error": "No open 24-hour service window...", "code": "no_service_window" }
{ "error": "Contact has opted out", "code": "opted_out" }
{ "error": "Marketing sends are paused...", "code": "marketing_paused" }`} />
                <ResponseBlock status={429} body={`{ "error": "Rate limit exceeded (600/min)", "code": "rate_limited" }`} />
              </div>
            </div>
          </div>
        </Section>

        {/* ─── INGEST EVENT API ─── */}
        <Section id="ingest-event" title="Ingest Event API" icon={Zap}>
          <div className="space-y-5">
            <div>
              <p className="text-sm text-gray-400 mb-3">
                Send store events (orders, carts, customers) to trigger automated WhatsApp journeys, OrderGuard risk scoring, and analytics.
              </p>
              <Endpoint method="POST" path={INGEST_URL} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Request Body</h3>
              <ParamTable params={[
                { name: 'event_type', type: 'string', required: true, desc: 'One of the supported event types (see table below)' },
                { name: 'dedupe_key', type: 'string', required: true, desc: 'Unique key to prevent duplicate processing (e.g. "order_1234")' },
                { name: 'contact.phone', type: 'string', required: true, desc: 'Customer phone number' },
                { name: 'contact.name', type: 'string', required: false, desc: 'Customer name' },
                { name: 'payload', type: 'object', required: false, desc: 'Event-specific data (order details, cart info, etc.)' },
              ]} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Supported Event Types</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 text-xs uppercase tracking-wider text-gray-500">
                      <th className="pb-2 pr-4 text-left">Event Type</th>
                      <th className="pb-2 pr-4 text-left">Triggers</th>
                      <th className="pb-2 text-left">Key Payload Fields</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {[
                      { type: 'order_created', triggers: 'Order confirmation journey, OrderGuard scoring', fields: 'order_id, total, currency, payment_method, cod, items[], address{}' },
                      { type: 'order_paid', triggers: 'Payment confirmation', fields: 'order_id, payment_method' },
                      { type: 'order_confirmed', triggers: 'Order confirmed notification', fields: 'order_id' },
                      { type: 'order_shipped', triggers: 'Shipping notification', fields: 'order_id, tracking_url, carrier' },
                      { type: 'order_delivered', triggers: 'Delivery confirmation', fields: 'order_id' },
                      { type: 'order_cancelled', triggers: 'Cancellation notice', fields: 'order_id, reason' },
                      { type: 'order_rto', triggers: 'Return to origin alert', fields: 'order_id, reason' },
                      { type: 'order_returned', triggers: 'Return processing', fields: 'order_id, amount' },
                      { type: 'order_refunded', triggers: 'Refund notification', fields: 'order_id, amount' },
                      { type: 'cod_pending', triggers: 'COD confirmation + OrderGuard scoring', fields: 'order_id, total, address_city, address_pincode' },
                      { type: 'prepay_nudge', triggers: 'Prepaid conversion nudge', fields: 'order_id, total, pay_url, discount' },
                      { type: 'cart_abandoned', triggers: 'Abandoned cart recovery sequence', fields: 'checkout_url, cart_total, currency, items[]' },
                      { type: 'checkout_started', triggers: 'Checkout tracking', fields: 'checkout_token, cart_total, checkout_url' },
                      { type: 'customer_created', triggers: 'Welcome journey', fields: 'email' },
                      { type: 'custom', triggers: 'Custom journey matching', fields: 'Any fields you need' },
                    ].map(e => (
                      <tr key={e.type}>
                        <td className="py-2 pr-4"><code className="text-emerald-400 font-mono">{e.type}</code></td>
                        <td className="py-2 pr-4 text-gray-300">{e.triggers}</td>
                        <td className="py-2 text-gray-500">{e.fields}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Example: Order Created Event</h3>
              <CodeBlock code={`curl -X POST '${INGEST_URL}' \\
  -H 'Authorization: Bearer rpk_live_YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "event_type": "order_created",
  "dedupe_key": "order_ORD1234",
  "contact": {
    "phone": "+91 98765 43210",
    "name": "Priya"
  },
  "payload": {
    "order_id": "ORD-1234",
    "total": 1499,
    "currency": "INR",
    "payment_method": "razorpay",
    "cod": false,
    "items": [
      { "name": "Blue Jutti", "quantity": 1, "price": 1499 }
    ],
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  }
}'`} />
              <ResponseBlock status={200} body={`{
  "ok": true,
  "event_id": "evt_a1b2c3...",
  "risk_score": 15,
  "risk_band": "low"
}`} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Example: Abandoned Cart</h3>
              <CodeBlock code={`curl -X POST '${INGEST_URL}' \\
  -H 'Authorization: Bearer rpk_live_YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "event_type": "cart_abandoned",
  "dedupe_key": "cart_abc123",
  "contact": {
    "phone": "9876543210",
    "name": "Rahul"
  },
  "payload": {
    "cart_total": 2999,
    "currency": "INR",
    "checkout_url": "https://yourstore.com/checkout/abc123",
    "items": [
      { "name": "Silk Scarf", "quantity": 2, "price": 1499 }
    ]
  }
}'`} />
            </div>
          </div>
        </Section>

        {/* ─── IDEMPOTENCY ─── */}
        <Section id="idempotency" title="Idempotency & Deduplication" icon={Shield}>
          <div className="space-y-3 text-sm text-gray-400">
            <p>
              Both APIs use idempotency keys to prevent duplicate processing. This means it's <strong className="text-white">safe to retry</strong> failed
              requests — the API will never send the same message or process the same event twice.
            </p>
            <div className="rounded-lg bg-gray-800 p-4 space-y-2">
              <p className="text-white text-xs font-semibold">How it works:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-400">
                <li><strong className="text-gray-300">partner-send:</strong> Uses <code className="text-emerald-400">idempotency_key</code> — if the same key is sent again, returns <code className="text-yellow-400">409</code> with the original message ID.</li>
                <li><strong className="text-gray-300">ingest-event:</strong> Uses <code className="text-emerald-400">dedupe_key</code> — if the same key is sent again, returns <code className="text-emerald-400">200</code> with <code className="text-gray-300">deduped: true</code>.</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Best practice:</strong> Use a natural identifier as your key — like <code className="text-gray-400">order_1234_shipped</code> or <code className="text-gray-400">cart_abc_abandoned</code>.
              This way, even if your webhook fires twice, the customer gets only one message.
            </p>
          </div>
        </Section>

        {/* ─── RATE LIMITS ─── */}
        <Section id="rate-limits" title="Rate Limits & Errors" icon={Clock}>
          <div className="space-y-4 text-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700 text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-2 pr-4 text-left">Limit</th>
                    <th className="pb-2 pr-4 text-left">Value</th>
                    <th className="pb-2 text-left">When exceeded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  <tr>
                    <td className="py-2 pr-4 text-gray-300">API calls</td>
                    <td className="py-2 pr-4 text-white font-mono">600/min per key</td>
                    <td className="py-2 text-red-400">429 Too Many Requests</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-gray-300">Template messages</td>
                    <td className="py-2 pr-4 text-white font-mono">As per your Meta tier</td>
                    <td className="py-2 text-gray-500">Meta returns error, message marked failed</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-gray-300">Text messages</td>
                    <td className="py-2 pr-4 text-white font-mono">24h service window</td>
                    <td className="py-2 text-red-400">422 no_service_window</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-white mb-2">All Error Codes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 text-xs uppercase tracking-wider text-gray-500">
                      <th className="pb-2 pr-4 text-left">Code</th>
                      <th className="pb-2 pr-4 text-left">HTTP</th>
                      <th className="pb-2 text-left">Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-400">
                    <tr><td className="py-1.5 pr-4 font-mono text-red-400">invalid_api_key</td><td className="py-1.5 pr-4">401</td><td className="py-1.5">API key is missing, invalid, or revoked</td></tr>
                    <tr><td className="py-1.5 pr-4 font-mono text-red-400">rate_limited</td><td className="py-1.5 pr-4">429</td><td className="py-1.5">Exceeded 600 requests/minute</td></tr>
                    <tr><td className="py-1.5 pr-4 font-mono text-yellow-400">idempotency_hit</td><td className="py-1.5 pr-4">409</td><td className="py-1.5">Same idempotency_key already processed (safe duplicate)</td></tr>
                    <tr><td className="py-1.5 pr-4 font-mono text-red-400">template_not_found</td><td className="py-1.5 pr-4">422</td><td className="py-1.5">Template name not in your synced templates</td></tr>
                    <tr><td className="py-1.5 pr-4 font-mono text-red-400">template_paused</td><td className="py-1.5 pr-4">422</td><td className="py-1.5">Template is paused by Meta due to quality</td></tr>
                    <tr><td className="py-1.5 pr-4 font-mono text-red-400">template_rejected</td><td className="py-1.5 pr-4">422</td><td className="py-1.5">Template was rejected by Meta</td></tr>
                    <tr><td className="py-1.5 pr-4 font-mono text-red-400">no_service_window</td><td className="py-1.5 pr-4">422</td><td className="py-1.5">Text message outside 24h window — use a template</td></tr>
                    <tr><td className="py-1.5 pr-4 font-mono text-red-400">opted_out</td><td className="py-1.5 pr-4">422</td><td className="py-1.5">Contact opted out or is blacklisted</td></tr>
                    <tr><td className="py-1.5 pr-4 font-mono text-red-400">marketing_paused</td><td className="py-1.5 pr-4">422</td><td className="py-1.5">Marketing sends paused due to quality — utility still works</td></tr>
                    <tr><td className="py-1.5 pr-4 font-mono text-red-400">no_whatsapp_account</td><td className="py-1.5 pr-4">422</td><td className="py-1.5">No active WhatsApp number connected to this account</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 text-center">
          <p className="text-sm text-gray-400">
            Need help? Contact us at{' '}
            <a href="mailto:support@reachpeak.in" className="text-emerald-400 hover:text-emerald-300">support@reachpeak.in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
