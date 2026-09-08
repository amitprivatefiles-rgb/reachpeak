# ReachPeak API — Platform Architecture

ReachPeak is a **WhatsApp marketing & messaging SaaS** for businesses: connect a WhatsApp
Business number, import contacts, send template campaigns, run automations (journeys, flows,
chatbots), have 2-way conversations in an Inbox, and pay per message from a prepaid wallet.
It also powers WhatsApp for partner platforms (e.g. PeakCart storefronts) via an API, and can
be driven from a user's own ChatGPT (a custom GPT "Action").

> This document is the source-of-truth map of how the platform is built and how the pieces
> talk to each other. Secrets/keys are **not** in this repo — they live in a private doc.

---

## 1. Tech stack at a glance

| Layer | Technology | Where it runs |
|-------|-----------|---------------|
| Frontend (dashboard) | React 18 + TypeScript, Vite, React Router, Tailwind-style utility CSS, lucide-react icons, GSAP/motion | **Vercel** → `www.reachpeakapi.in` (repo `amitprivatefiles-rgb/reachpeak`, branch `main`, auto-build on push) |
| Backend API | **Supabase Edge Functions** (Deno / TypeScript) — 37 functions | Supabase project `xykynbfsogwxecqzhfdm` |
| Database + Auth | **Supabase Postgres** (44 tables, RLS), Supabase Auth (JWT), Supabase Vault (secrets), `pg_cron` + `pg_net` (scheduled jobs) | Supabase (managed, ap-south-1) |
| Async worker | **Node** container `reachpeak-worker` — polls the send queue, calls Meta, settles the wallet | VPS `72.60.102.136` (Docker) |
| Messaging provider | **Meta WhatsApp Cloud API** (Graph API) | Meta |
| Payments | **Razorpay** (platform account) — wallet top-ups + plan subscriptions | Razorpay |
| Email | **Resend** (transactional) | Resend |

---

## 2. Platform tree

```
ReachPeak
│
├── Frontend (Vercel — www.reachpeakapi.in)              React + Vite SPA
│   ├── Auth: Login / Signup                              Supabase Auth (email+password, JWT)
│   ├── Dashboard, Reports                                metrics & analytics
│   ├── Contacts, LeadSources, Tags                       audience
│   ├── Templates                                         create/sync Meta templates
│   ├── Campaigns / UserCampaigns / CampaignApprovals     bulk template sends
│   ├── Journeys / Flows(Agents) / Automation             event- & chat-triggered automation
│   ├── Inbox                                             2-way conversations
│   ├── Wallet                                            balance + Razorpay recharge
│   ├── Integrations                                      API keys, event ingest, "Connect to ChatGPT"
│   ├── ConnectWhatsApp / WhatsAppSettings                embedded signup / number mgmt
│   ├── Settings / PaymentSettings / OrderGuard           store settings, per-user Razorpay (COD→prepaid)
│   ├── ShopifyConnect                                    Shopify store link
│   └── Admin (super-admin only): UserManagement, AdminBilling, AdminProvisionStore, AdminSupport
│
├── Backend (Supabase Edge Functions — Deno)             see §5 for the full list
│   ├── Sending:     partner-send, send-message, whatsapp-assistant, enqueue-campaign
│   ├── Inbound:     whatsapp-webhook, mark-read
│   ├── Automation:  journey-engine, flow-engine, campaign-action, checkout-scan, callback-retry, process-notifications
│   ├── Billing:     admin-billing, create-recharge-order, create-subscription-order, wallet-webhook, razorpay-webhook, create-payment-link, save-payment-provider, check-waba-payment
│   ├── Onboarding:  embedded-signup-exchange, save-whatsapp-account, manage-template, support, create-user
│   ├── Partners:    partner-provision, partner-health, partner-callbacks, ingest-event
│   ├── Shopify:     save-shopify-connection, shopify-webhook, shopify-test-event
│   ├── Admin:       admin-provision-store, admin-support
│   └── Misc:        send-email, data-deletion, auto-increment-campaigns
│
├── Database (Supabase Postgres — 44 tables)             see §6
│   ├── Identity:    profiles, subscriptions, integration_keys
│   ├── WhatsApp:    whatsapp_accounts, templates, contacts, conversations, messages, failed_messages
│   ├── Campaigns:   campaigns, campaign_contacts, campaign_agents, agents
│   ├── Automation:  journeys, journey_executions, flows, flow_executions, events
│   ├── Wallet:      wallets, wallet_transactions, wallet_recharges, message_pricing, platform_payment_providers
│   ├── Commerce:    orders, payment_providers, payment_links, orderguard_settings, pincode_stats
│   └── Ops:         activity_logs, notifications, notification_outbox, support_tickets, callback_requests, ...
│
├── Worker (VPS Docker — reachpeak-worker)               claim → send via Meta → settle wallet
│
└── External
    ├── Meta WhatsApp Cloud API   (send + webhooks)
    ├── Razorpay                  (recharge + subscription orders + webhooks)
    └── Resend                    (transactional email)
```

---

## 3. Core concepts

### 3.1 Who pays what — Model C (managed) + Option A (self-serve)
- **Option C (managed):** the founder's Meta account pays Meta for all messaging; client WABAs live
  under the founder's Business Manager. Clients **prepay a wallet** in ReachPeak; every WhatsApp
  message deducts a per-category price (the founder's margin). Managed clients are provisioned with
  an active ₹0 subscription.
- **Option A (self-serve):** a user connects **their own** WABA via WhatsApp Embedded Signup and pays
  Meta directly; they still use ReachPeak for tooling.
- **Direct signups** to `reachpeakapi.in` must buy a **plan** (Monthly / Yearly) via Razorpay to
  activate (gated in the app until an active subscription exists).

### 3.2 The wallet (money is in **paise**, bigint)
`wallets` has `balance_paise` + `held_paise`. An immutable `wallet_transactions` ledger records every
move (idempotent by `(user_id, type, reference)`). Per-message prices live in `message_pricing`
(by category: marketing / utility / authentication / service).

**Deduction lifecycle — hold → settle → release:**
1. On enqueue, `partner-send` **holds** the price (ref `msg:<id>`) and inserts the message as
   `pending_charge` → flips to `queued` (or `blocked_insufficient_balance` → HTTP 402).
2. The **worker** sends via Meta; on success it **settles** the hold, on failure it **releases** it.
3. Money RPCs (`wallet_credit / hold / settle / release / debit`) are service-role only and idempotent.

### 3.3 Two authentication modes
- **Dashboard users:** Supabase Auth JWT (email+password). Edge functions verify the JWT and check
  `profiles.role` / `is_active`. Admin functions require `role = 'admin'`.
- **API / partners / ChatGPT:** a per-user **API key** `rpk_live_…` (created in *Integrations → Create
  API Key*). Only the SHA-256 hash is stored in `integration_keys`; the key maps to a `user_id`.
  `partner-send`, `ingest-event`, `whatsapp-assistant`, `partner-health` use this.
- Edge functions that do their own auth are deployed with `--no-verify-jwt`. **CORS note:** browser-
  called functions must allow the `x-client-info` header (supabase-js sends it) or the request is
  blocked before it arrives.

---

## 4. Key flows

### 4.1 Outbound WhatsApp (the send pipeline)
```
caller ─► partner-send / send-message / enqueue-campaign
            │  auth (API key or JWT) → load whatsapp_account → price + WALLET HOLD
            │  build Meta components from the stored template (header media, body {{n}}, buttons)
            ▼
        messages row (status=queued)
            │
        reachpeak-worker  (polls, claims queued rows)
            │  POST Meta Cloud API  (/{phone_number_id}/messages)
            ├─ success → status=sent, WALLET SETTLE, provider_message_id saved
            └─ failure → status=failed, WALLET RELEASE (+ blacklist on hard bounce)
            ▼
        whatsapp-webhook  ← Meta delivery/read/failed callbacks → updates message + conversation
```
Templates: dynamic **URL-button parameters use Meta's 0-based index**; header images are sent as a
media parameter; body variables fill `{{1}},{{2}}…` in order.

### 4.2 Inbound & conversations
`whatsapp-webhook` receives inbound messages, status updates and button taps → upserts
`conversations` + `messages`, can trigger `flow-engine` (chatbot) and `journey-engine`. The **Inbox**
reads these; `mark-read` clears unread counts. Partner platforms get inbound forwarded to their
`integration_keys.callback_url` (retried by `callback-retry` / reconciled by `partner-callbacks`).

### 4.3 Billing & payments
- **Wallet top-up:** `create-recharge-order` (platform Razorpay) → user pays → `wallet-webhook`
  (HMAC-verified) credits the wallet (idempotent).
- **Plan subscription:** `create-subscription-order` → user pays → `wallet-webhook` activates the
  subscription (sets period, idempotent).
- **Admin control plane:** `admin-billing` (admin only) stores the platform Razorpay keys in Vault,
  sets per-message pricing, lists wallets, and can manually credit/debit.
- **Per-user (merchant) payments:** `save-payment-provider` + `razorpay-webhook` power OrderGuard
  (COD→prepaid) for a user's own buyers — separate from the platform wallet.

### 4.4 Automations
- **Campaigns:** `enqueue-campaign` fans a template out to a contact segment (server-side, wallet-gated);
  `campaign-action` handles retry/cancel/start-now; `CampaignApprovals` gates risky sends.
- **Journeys:** `journey-engine` runs event-triggered multi-step flows.
- **Flows / chatbot:** `flow-engine` matches inbound triggers and walks a node graph.
- **Scheduled jobs (`pg_cron` → `pg_net`):** `checkout-scan` (abandoned checkouts, 5 min),
  `callback-retry` (1 min), `process-notifications`, `auto-increment-campaigns`.

### 4.5 Integrations
- **Partner platform (PeakCart):** `partner-provision` (server-to-server one-click connect issues an
  `rpk_live_` key + callback config) → `partner-send` sends, inbound is forwarded to the callback URL,
  `partner-health` / `partner-callbacks` for status/reconciliation.
- **Generic events:** `ingest-event` accepts store events (API-key auth) → feeds journeys/flows.
- **Shopify:** `save-shopify-connection` + `shopify-webhook` (HMAC) map Shopify events in.
- **ChatGPT:** `whatsapp-assistant` exposes an OpenAPI schema (`/openapi.json`) + `/templates` +
  `/send` so a user's custom GPT can send WhatsApp using their own `rpk_live_` key (forwards to
  `partner-send`, so wallet + logging are identical).

---

## 5. Edge function reference (37)

| Function | Auth | Purpose |
|----------|------|---------|
| partner-send | API key | WhatsApp send for partners/API (text+template), wallet hold, idempotent |
| send-message | JWT | Dashboard send (text/template/media) |
| whatsapp-assistant | API key | ChatGPT Action gateway (openapi.json + /templates + /send→partner-send) |
| enqueue-campaign | JWT/service | Server-side campaign fan-out (wallet-gated) |
| campaign-action | JWT | Campaign retry / cancel / start-now |
| whatsapp-webhook | Meta sig | Inbound messages, delivery/read/failed statuses, button taps |
| mark-read | JWT | Reset conversation unread count |
| journey-engine | service | Event-triggered journey automation |
| flow-engine | service | Chatbot trigger-matching + node-graph walker |
| checkout-scan | cron | Abandoned-checkout scan (every 5 min) |
| callback-retry | cron | Retry failed partner callbacks (every min) |
| process-notifications | cron | Drain notification_outbox via system sender |
| auto-increment-campaigns | cron | Scheduled campaign stepping |
| admin-billing | JWT admin | Platform Razorpay keys (Vault), pricing, wallet oversight, manual adjust |
| create-recharge-order | JWT | Razorpay order for wallet top-up (platform keys) |
| create-subscription-order | JWT | Razorpay order for a ReachPeak plan |
| wallet-webhook | Razorpay HMAC | Credit wallet / activate subscription on payment |
| razorpay-webhook | Razorpay HMAC (per-tenant ?u=) | Per-user merchant payments (OrderGuard) |
| create-payment-link | JWT/service | Razorpay payment links (inbox/pipeline) |
| save-payment-provider | JWT | Save a user's own Razorpay (merchant) |
| check-waba-payment | JWT | Live WABA/number status (Option A) |
| embedded-signup-exchange | public/JWT | WhatsApp Embedded Signup token exchange |
| save-whatsapp-account | JWT | Persist a connected WABA/number |
| manage-template | JWT | Create/sync Meta templates (normalizes casing) |
| support | JWT | User support tickets + onboarding-choice |
| create-user | JWT admin | Admin-create a user (email-confirmed) + active subscription + wallet |
| partner-provision | partner secret | One-click partner connect (issues API key + callback) |
| partner-health | API key | Partner health/status |
| partner-callbacks | API key | Partner reconciliation (poll unacked callbacks) |
| ingest-event | API key | Generic store event intake → automations |
| save-shopify-connection | JWT | Link a Shopify store |
| shopify-webhook | Shopify HMAC | Shopify events → internal events |
| shopify-test-event | JWT | Simulated Shopify webhook for testing |
| admin-provision-store | JWT admin | Managed-store provisioning (founder System User token) |
| admin-support | JWT admin | Admin tickets + callbacks console |
| send-email | service | Transactional email via Resend |
| data-deletion | Meta callback | Meta data-deletion compliance |

---

## 6. Database (44 tables, grouped)

- **Identity / access:** `profiles`, `subscriptions`, `integration_keys`, `internal_config`, `automation_settings`
- **WhatsApp core:** `whatsapp_accounts`, `managed_whatsapp_config`, `templates`, `contacts`, `contact_tags`, `tags`, `conversations`, `messages`, `failed_messages`, `lead_sources`
- **Campaigns:** `campaigns`, `campaign_contacts`, `campaign_agents`, `agents`
- **Automation:** `journeys`, `journey_executions`, `flows`, `flow_executions`, `flow_run_log`, `events`
- **Wallet / billing:** `wallets`, `wallet_transactions`, `wallet_recharges`, `message_pricing`, `messaging_cost_config`, `platform_payment_providers`
- **Commerce (merchant):** `orders`, `payment_providers`, `payment_links`, `orderguard_settings`, `pincode_stats`, `customer_stats`
- **Ops / notifications:** `activity_logs`, `dashboard_metrics`, `notifications`, `notification_outbox`, `process`-driven jobs, `support_tickets`, `callback_requests`, `callback_log`

Money RPCs (service-role, idempotent): `wallet_credit`, `wallet_hold`, `wallet_settle`,
`wallet_release`, `wallet_debit`. Secrets stored via Vault RPCs `store_vault_secret` /
`get_vault_secret`. Migrations: `supabase/migrations/` (54 files).

---

## 7. Repos, hosting & deploy

| Piece | Location | Deploy |
|-------|----------|--------|
| Frontend | `github.com/amitprivatefiles-rgb/reachpeak` → `src/` | Push to `main` → Vercel auto-builds (`vite build`) → `www.reachpeakapi.in` |
| Edge functions | same repo → `supabase/functions/` | `supabase functions deploy <name> --no-verify-jwt` (project ref `xykynbfsogwxecqzhfdm`) |
| Worker | same repo → `worker/` | Docker image `reachpeak-worker:latest` on VPS `72.60.102.136` |
| DB migrations | same repo → `supabase/migrations/` | applied to the Supabase project |

**Domains:** `www.reachpeakapi.in` (app), `reachpeakapi.in` → redirects to www. The old API host
`api.reachpeakapi.in` is **retired** — all edge-function URLs use
`https://xykynbfsogwxecqzhfdm.supabase.co/functions/v1/<name>`.

---

## 8. Security notes
- All secrets (Meta tokens, Razorpay keys, Supabase service-role, Razorpay webhook secrets) live in
  **Supabase Vault** or Supabase project config — never in this repo.
- API keys are stored **hashed** (SHA-256); the raw `rpk_live_` value is shown once at creation.
- Payment webhooks are **HMAC-verified**; money RPCs are idempotent and service-role only.
- Row Level Security isolates each user's data; admin functions require `role='admin'`.
