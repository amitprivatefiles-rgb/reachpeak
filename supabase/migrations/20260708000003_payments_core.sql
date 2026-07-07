-- ============================================================
-- Payments Core — Razorpay credentials (Vault-encrypted) + payment links
-- Fully idempotent — safe to re-run
-- ============================================================

-- 1. Payment providers — per-tenant Razorpay config
--    key_secret_enc / webhook_secret_enc hold Vault secret UUIDs (not raw keys)
create table if not exists payment_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  provider         text not null default 'razorpay' check (provider in ('razorpay')),
  key_id           text not null,
  key_secret_enc   uuid not null,       -- vault.secrets.id
  webhook_secret_enc uuid,              -- vault.secrets.id (nullable until webhook configured)
  mode             text not null default 'live' check (mode in ('live','test')),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, provider)
);
alter table payment_providers enable row level security;
drop policy if exists "own pay provider" on payment_providers;
create policy "own pay provider" on payment_providers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Service role needs full access for edge functions
drop policy if exists "payment_providers_service_role" on payment_providers;
create policy "payment_providers_service_role" on payment_providers
  for all to service_role using (true) with check (true);

-- Public view — frontend reads ONLY this (no secret columns)
create or replace view payment_providers_public as
  select id, user_id, provider, key_id, mode, is_active, created_at, updated_at
  from payment_providers;

-- 2. Payment links
create table if not exists payment_links (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  order_id       uuid references orders(id) on delete set null,
  contact_phone  text,
  provider       text not null default 'razorpay',
  rzp_plink_id   text,
  short_url      text,
  amount         numeric(12,2) not null,
  currency       text not null default 'INR',
  description    text,
  status         text not null default 'created'
    check (status in ('created','paid','cancelled','expired','failed')),
  rzp_payment_id text,
  paid_at        timestamptz,
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, provider, rzp_plink_id)
);

-- Partial unique index: prevent concurrent duplicate active links per order
create unique index if not exists payment_links_order_active_idx
  on payment_links (order_id) where status in ('created', 'paid');

create index if not exists payment_links_phone_idx on payment_links (user_id, contact_phone);
alter table payment_links enable row level security;
drop policy if exists "own pay links" on payment_links;
create policy "own pay links" on payment_links for select using (auth.uid() = user_id);
drop policy if exists "payment_links_service_role" on payment_links;
create policy "payment_links_service_role" on payment_links
  for all to service_role using (true) with check (true);

-- 3. Orders additions
alter table orders add column if not exists payment_link_id uuid references payment_links(id);
alter table orders add column if not exists converted_to_prepaid boolean not null default false;

-- 4. OrderGuard settings — prepay discount
alter table orderguard_settings add column if not exists
  prepay_discount_pct integer not null default 0;
-- Drop-and-recreate check constraint pattern for idempotency
alter table orderguard_settings drop constraint if exists orderguard_settings_prepay_discount_check;
alter table orderguard_settings add constraint orderguard_settings_prepay_discount_check
  check (prepay_discount_pct between 0 and 50);

-- 5. DB function to decrypt vault secrets (callable via service-role RPC)
create or replace function get_vault_secret(secret_id uuid)
returns text
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  result text;
begin
  select decrypted_secret into result
  from vault.decrypted_secrets
  where id = secret_id;
  return result;
end;
$$;

-- Revoke from public, only service role can call
revoke execute on function get_vault_secret(uuid) from public;
revoke execute on function get_vault_secret(uuid) from anon;
revoke execute on function get_vault_secret(uuid) from authenticated;

-- Store a secret in vault and return its UUID (service-role only)
create or replace function store_vault_secret(p_secret text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  result_id uuid;
begin
  select vault.create_secret(p_secret, p_name) into result_id;
  return result_id;
end;
$$;

revoke execute on function store_vault_secret(text, text) from public;
revoke execute on function store_vault_secret(text, text) from anon;
revoke execute on function store_vault_secret(text, text) from authenticated;
