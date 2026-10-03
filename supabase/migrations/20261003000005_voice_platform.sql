-- AI Calling platform (admin-operated, Plivo): connection settings, phone numbers, per-account calling settings.
-- Secrets (Plivo auth token, webhook path secret) live in Supabase Vault; tables only hold Vault ids.

-- 1) Platform connection (single row). Written only by the admin-voice edge function (service role).
create table if not exists public.voice_settings (
  id                 int primary key default 1 check (id = 1),
  plivo_auth_id      text,
  plivo_token_vault  uuid,             -- Vault id of the Plivo auth token
  path_secret_vault  uuid,             -- Vault id of the secret in our webhook URLs
  public_base        text not null default 'https://voice.reachpeak.in',
  plivo_app_id       text,
  strict_signatures  boolean not null default false,
  account_name       text,
  cash_credits       text,
  last_verified_at   timestamptz,
  last_error         text,
  updated_at         timestamptz not null default now()
);
insert into public.voice_settings (id) values (1) on conflict (id) do nothing;
alter table public.voice_settings enable row level security;
drop policy if exists voice_settings_admin_read on public.voice_settings;
create policy voice_settings_admin_read on public.voice_settings for select using (public.is_admin());

-- 2) Phone numbers rented on Plivo, and which account/agent answers each one.
create table if not exists public.voice_numbers (
  number          text primary key,                 -- digits, e.g. 918045671234
  alias           text,
  number_type     text,
  region          text,
  monthly_rental  text,
  linked          boolean not null default false,   -- attached to our Plivo application
  on_plivo        boolean not null default true,    -- false = no longer on the Plivo account
  user_id         uuid references auth.users(id) on delete set null,
  agent_id        uuid references public.voice_agents(id) on delete set null,
  notes           text not null default '',
  last_synced_at  timestamptz,
  updated_at      timestamptz not null default now()
);
create index if not exists voice_numbers_user_idx on public.voice_numbers (user_id);
alter table public.voice_numbers enable row level security;
drop policy if exists voice_numbers_admin_all on public.voice_numbers;
drop policy if exists voice_numbers_own_read on public.voice_numbers;
create policy voice_numbers_admin_all on public.voice_numbers for all using (public.is_admin()) with check (public.is_admin());
create policy voice_numbers_own_read on public.voice_numbers for select using (user_id = auth.uid());

-- The agent on a number must belong to the account the number is assigned to.
create or replace function public.voice_numbers_check() returns trigger language plpgsql set search_path = public as $$
begin
  new.number := regexp_replace(new.number, '\D', '', 'g');
  new.updated_at := now();
  if new.agent_id is not null and not exists (select 1 from public.voice_agents a where a.id = new.agent_id and a.user_id = new.user_id) then
    raise exception 'agent does not belong to this account';
  end if;
  return new;
end $$;
drop trigger if exists voice_numbers_check on public.voice_numbers;
create trigger voice_numbers_check before insert or update on public.voice_numbers for each row execute function public.voice_numbers_check();

-- 3) Per-account calling settings (admin-managed). No row = defaults below.
create table if not exists public.voice_account_settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  calling_enabled      boolean not null default true,
  outbound_enabled     boolean not null default false,   -- TRAI: only after the number series/consent is confirmed
  caller_number        text references public.voice_numbers(number) on delete set null,
  compliance_note      text not null default '',         -- e.g. "160 series confirmed by Plivo, ticket #123"
  price_override_paise integer check (price_override_paise is null or price_override_paise >= 0),
  max_concurrent       integer not null default 3 check (max_concurrent between 1 and 50),
  monthly_minute_cap   integer check (monthly_minute_cap is null or monthly_minute_cap >= 0),
  hours_start          integer not null default 9 check (hours_start between 0 and 23),
  hours_end            integer not null default 21 check (hours_end between 1 and 24),
  updated_at           timestamptz not null default now(),
  updated_by           uuid
);
alter table public.voice_account_settings enable row level security;
drop policy if exists voice_account_admin_all on public.voice_account_settings;
drop policy if exists voice_account_own_read on public.voice_account_settings;
create policy voice_account_admin_all on public.voice_account_settings for all using (public.is_admin()) with check (public.is_admin());
create policy voice_account_own_read on public.voice_account_settings for select using (user_id = auth.uid());

-- 4) Call log: what Plivo billed, and why the call ended.
alter table public.voice_calls add column if not exists provider_bill_sec integer;
alter table public.voice_calls add column if not exists provider_cost numeric;
alter table public.voice_calls add column if not exists hangup_cause text;
create index if not exists voice_calls_provider_idx on public.voice_calls (provider_call_id);

-- Phone numbers are now managed only in voice_numbers (admin). The old per-agent field stays for display, kept in sync.
create or replace function public.voice_numbers_sync_agent() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.agent_id is not null then
    update public.voice_agents set phone_number = null where id = old.agent_id and phone_number = old.number;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.agent_id is not null then
    update public.voice_agents set phone_number = new.number where id = new.agent_id;
  end if;
  return null;
end $$;
drop trigger if exists voice_numbers_sync_agent on public.voice_numbers;
create trigger voice_numbers_sync_agent after insert or update or delete on public.voice_numbers for each row execute function public.voice_numbers_sync_agent();

do $p$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'voice_calls') then
    alter publication supabase_realtime add table public.voice_calls;
  end if;
end $p$;

-- Admins set up agents on behalf of any account (AI Calling Setup → Accounts → Manage agents).
drop policy if exists voice_agents_own_insert on public.voice_agents;
create policy voice_agents_own_insert on public.voice_agents for insert with check (user_id = auth.uid() or public.is_admin());
