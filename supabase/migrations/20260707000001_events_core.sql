-- ============================================================
-- Events Core — integration keys + events stream
-- ============================================================

-- 1. Per-tenant API keys for event ingestion
create table if not exists integration_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  source          text not null default 'api',
  key_prefix      text not null,
  key_hash        text not null,
  callback_url    text,
  callback_secret text,
  provider_secret text,          -- Shopify HMAC secret, etc. (Pass 2)
  is_active       boolean not null default true,
  last_used_at    timestamptz,
  created_at      timestamptz not null default now()
);
alter table integration_keys enable row level security;
create policy "own_keys" on integration_keys for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. The events stream
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source        text not null,
  event_type    text not null check (event_type in
    ('cart_abandoned','checkout_started','order_created','order_paid',
     'order_shipped','order_delivered','order_cancelled','cod_pending',
     'customer_created','custom')),
  contact_phone text,
  contact_name  text,
  dedupe_key    text not null,
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'received'
    check (status in ('received','processed','ignored','error')),
  error_message text,
  created_at    timestamptz not null default now(),
  unique (user_id, source, dedupe_key)
);
create index if not exists events_user_type_idx
  on events (user_id, event_type, created_at desc);
create index if not exists events_phone_idx
  on events (user_id, contact_phone);
alter table events enable row level security;
create policy "own_events_read" on events for select
  using (auth.uid() = user_id);
-- Service role writes only
create policy "events_service_role" on events
  for all to service_role using (true) with check (true);

-- 3. Extend contacts.source CHECK to allow integration sources
-- Drop old constraint, add new one including API sources
alter table contacts drop constraint if exists contacts_source_check;
alter table contacts add constraint contacts_source_check
  check (source in ('Excel','Facebook','Instagram','Website','WhatsApp','Manual',
                    'api','peakcart','shopify','woocommerce'));
