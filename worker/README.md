# ReachPeak Send Worker

A standalone Node.js service that polls Supabase for queued WhatsApp messages and sends them via the Meta Cloud API. Runs on the Hostinger VPS.

## Prerequisites

- **Node.js 18+**
- Supabase project with all migrations applied (including `claim_queued_messages` function)
- A connected WhatsApp Business Account in the `whatsapp_accounts` table

## Setup

```bash
cd worker
npm install
cp .env.example .env
# Edit .env with your real values
```

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `GRAPH_API_VERSION` | Meta Graph API version, e.g. `v23.0` |
| `POLL_INTERVAL_MS` | How often to poll for queued messages (default: 2000) |
| `BATCH_SIZE` | Max messages to claim per tick (default: 50) |
| `MAX_RETRIES` | Retries on 130429 / network errors (default: 3) |

## Run

```bash
# Development (with tsx)
npm run dev

# Production
npm run build
npm start
```

## PM2 (recommended)

```bash
npm run build
pm2 start dist/index.js --name reachpeak-worker
pm2 save
pm2 startup
```

## Systemd

Create `/etc/systemd/system/reachpeak-worker.service`:

```ini
[Unit]
Description=ReachPeak WhatsApp Send Worker
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/reachpeak/worker
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/reachpeak/worker/.env

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable reachpeak-worker
sudo systemctl start reachpeak-worker
```

## How It Works

1. Every `POLL_INTERVAL_MS`, the worker calls `claim_queued_messages(batch_size)` — a PostgreSQL function that atomically transitions `queued` → `sending` using `FOR UPDATE SKIP LOCKED`
2. Claimed messages are grouped by `whatsapp_account_id`
3. For each group, the account's `phone_number_id` + `access_token` are fetched (service role bypasses RLS)
4. Messages are sent via `POST graph.facebook.com/{version}/{phone_number_id}/messages` with rate limiting (~80 msg/sec per number)
5. On success: row updated to `status='sent'` with `wamid` and `sent_at`
6. On failure: row updated to `status='failed'` with `error_code` and `error_message`
7. The webhook function (separate) later advances `sent` → `delivered` → `read` from Meta's status callbacks
8. On error `130429` (throughput exceeded): exponential backoff (1s, 2s, 4s) up to `MAX_RETRIES`
