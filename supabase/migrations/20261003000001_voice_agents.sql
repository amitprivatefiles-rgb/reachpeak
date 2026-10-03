-- AI Calling: each business configures its own voice agent; every call is logged and billed per minute from the wallet.
-- The voice server (VPS, service role) reads agents and writes calls. Users only manage their own agents and read their own calls.

create table if not exists public.voice_agents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,                          -- label in the dashboard, e.g. "Clinic booking line"
  business_name text not null,
  agent_name    text not null default 'Riya',           -- what the agent calls itself
  voice         text not null default 'Aoede'
                check (voice in ('Aoede','Kore','Leda','Zephyr','Puck','Charon','Fenrir','Orus')),
  purpose       text not null default '',               -- what the call should achieve
  brief         text not null default '',               -- facts the agent may use: services, prices, timings, address, policies
  slots         text not null default '',               -- availability it may offer (weekly)
  instructions  text not null default '',               -- optional extra rules from the business
  direction     text not null default 'both' check (direction in ('inbound','outbound','both')),
  phone_number  text unique,                            -- assigned by ReachPeak admin only (see trigger)
  save_transcripts boolean not null default true,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint voice_agents_text_limits check (
    char_length(name) <= 80 and char_length(business_name) <= 120 and char_length(agent_name) <= 40
    and char_length(purpose) <= 600 and char_length(brief) <= 6000 and char_length(slots) <= 1500 and char_length(instructions) <= 2000)
);
create index if not exists voice_agents_user_idx on public.voice_agents (user_id, created_at desc);

-- Only admins (or the service role) may assign / change a phone number: stops a user pointing another business's number at their agent.
create or replace function public.voice_agents_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  -- trusted: service role (voice server), admins, and direct DB sessions (SQL editor/migrations: no request JWT at all)
  if coalesce(auth.role(), '') not in ('service_role', '') and not coalesce(public.is_admin(), false) then
    if tg_op = 'INSERT' then
      new.phone_number := null;
    elsif new.phone_number is distinct from old.phone_number then
      new.phone_number := old.phone_number;
    end if;
    if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
      new.user_id := old.user_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists voice_agents_guard on public.voice_agents;
create trigger voice_agents_guard before insert or update on public.voice_agents for each row execute function public.voice_agents_guard();

alter table public.voice_agents enable row level security;
drop policy if exists voice_agents_own_select on public.voice_agents;
drop policy if exists voice_agents_own_insert on public.voice_agents;
drop policy if exists voice_agents_own_update on public.voice_agents;
drop policy if exists voice_agents_own_delete on public.voice_agents;
create policy voice_agents_own_select on public.voice_agents for select using (user_id = auth.uid() or public.is_admin());
create policy voice_agents_own_insert on public.voice_agents for insert with check (user_id = auth.uid());
create policy voice_agents_own_update on public.voice_agents for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy voice_agents_own_delete on public.voice_agents for delete using (user_id = auth.uid() or public.is_admin());

create table if not exists public.voice_calls (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  agent_id         uuid references public.voice_agents(id) on delete set null,
  agent_label      text,                                 -- agent name at call time (survives agent deletion)
  direction        text not null check (direction in ('web','in','out')),
  customer_number  text,
  customer_name    text,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_sec     integer not null default 0,
  billed_minutes   integer not null default 0,
  charge_paise     bigint  not null default 0,
  outcome          text,
  summary          text,
  when_text        text,
  details          text,
  end_reason       text,
  transcript       jsonb,
  model            text,
  provider_call_id text,
  created_at       timestamptz not null default now()
);
create index if not exists voice_calls_user_idx on public.voice_calls (user_id, started_at desc);
create index if not exists voice_calls_agent_idx on public.voice_calls (agent_id, started_at desc);

alter table public.voice_calls enable row level security;
drop policy if exists voice_calls_own_select on public.voice_calls;
create policy voice_calls_own_select on public.voice_calls for select using (user_id = auth.uid() or public.is_admin());
-- no insert/update/delete policies: only the voice server (service role) writes calls.

-- Per-minute price (paise), editable by the founder like the message prices. ₹4.00/min default.
-- The category whitelist only knew the 4 WhatsApp categories: add voice_minute (existing values unchanged).
alter table public.message_pricing drop constraint if exists message_pricing_category_check;
alter table public.message_pricing add constraint message_pricing_category_check
  check (category = any (array['marketing','utility','authentication','service','voice_minute']));
insert into public.message_pricing (category, price_paise) values ('voice_minute', 400)
  on conflict (category) do nothing;
