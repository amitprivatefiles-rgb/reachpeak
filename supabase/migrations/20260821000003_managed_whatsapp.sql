-- ============================================================
-- Managed WhatsApp (Option C): the founder's ONE System User token, stored in
-- Vault, lets the platform send from any number in the founder's BM. Admins
-- provision a store by linking a number (added in WhatsApp Manager) to that
-- store's ReachPeak account. Idempotent.
-- ============================================================

create table if not exists managed_whatsapp_config (
  singleton        boolean primary key default true check (singleton = true),
  business_id      text,
  system_token_enc uuid,                 -- vault.secrets.id (the System User token)
  updated_by       uuid references auth.users(id),
  updated_at       timestamptz not null default now()
);
alter table managed_whatsapp_config enable row level security;
-- service-role only (edge functions). No public/authenticated policy.
drop policy if exists "managed_wa service_role" on managed_whatsapp_config;
create policy "managed_wa service_role" on managed_whatsapp_config for all to service_role using (true) with check (true);

-- Safe status view for the admin UI (no secret) — is the system token configured?
create or replace view managed_whatsapp_status as
  select business_id,
         (system_token_enc is not null) as token_configured,
         updated_at
  from managed_whatsapp_config where singleton = true;

-- Admin oversight: managed (Option C) accounts = onboarded_via 'managed'.
create or replace view admin_managed_accounts as
  select w.id, w.user_id, p.email, p.full_name,
         w.display_phone_number, w.verified_name, w.waba_id, w.phone_number_id,
         w.status, w.is_active, w.created_at,
         coalesce(wl.balance_paise, 0) as wallet_balance_paise
  from whatsapp_accounts w
  left join profiles p on p.id = w.user_id
  left join wallets  wl on wl.user_id = w.user_id
  where w.onboarded_via = 'managed';
