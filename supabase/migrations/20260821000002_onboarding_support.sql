-- ============================================================
-- Onboarding choice (Option A self-serve vs Option C managed wallet)
-- + Support system (tickets, callback requests) + automated-WhatsApp outbox.
-- Fully idempotent — safe to re-run.
-- ============================================================

-- ── 1. profiles: which billing model the user picked at onboarding ──
alter table profiles add column if not exists onboarding_choice   text
  check (onboarding_choice in ('own_billing','wallet'));
alter table profiles add column if not exists onboarding_completed boolean not null default false;

-- ── 2. whatsapp_accounts: mark the ONE platform "system sender" (8583021893) ──
--    Used to send all automated notifications (ticket/callback/wallet-signup).
alter table whatsapp_accounts add column if not exists is_system boolean not null default false;
-- At most one system sender.
create unique index if not exists whatsapp_accounts_one_system_idx
  on whatsapp_accounts (is_system) where is_system = true;

-- ── 3. support_tickets ──
create table if not exists support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject     text not null,
  message     text not null,
  category    text not null default 'general'
              check (category in ('general','billing','technical','whatsapp','account','other')),
  status      text not null default 'open'
              check (status in ('open','in_progress','resolved','closed')),
  priority    text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  contact_phone text,
  admin_notes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_idx on support_tickets (status, created_at desc);
alter table support_tickets enable row level security;
drop policy if exists "own tickets read"  on support_tickets;
create policy "own tickets read"  on support_tickets for select using (auth.uid() = user_id);
drop policy if exists "own tickets write" on support_tickets;
create policy "own tickets write" on support_tickets for insert with check (auth.uid() = user_id);
drop policy if exists "tickets service_role" on support_tickets;
create policy "tickets service_role" on support_tickets for all to service_role using (true) with check (true);

-- ── 4. callback_requests (phone call-back — distinct from webhook `callback_log`) ──
create table if not exists callback_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text,
  phone          text not null,
  reason         text,
  preferred_time text,
  status         text not null default 'requested'
                 check (status in ('requested','contacted','done','cancelled')),
  admin_notes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists callback_requests_user_idx on callback_requests (user_id, created_at desc);
create index if not exists callback_requests_status_idx on callback_requests (status, created_at desc);
alter table callback_requests enable row level security;
drop policy if exists "own callbacks read"  on callback_requests;
create policy "own callbacks read"  on callback_requests for select using (auth.uid() = user_id);
drop policy if exists "own callbacks write" on callback_requests;
create policy "own callbacks write" on callback_requests for insert with check (auth.uid() = user_id);
drop policy if exists "callbacks service_role" on callback_requests;
create policy "callbacks service_role" on callback_requests for all to service_role using (true) with check (true);

-- ── 5. notification_outbox — every automated WhatsApp the platform must send ──
--    Sent via the system-sender WABA using an approved template. Queued+retryable
--    so it survives "sender not connected yet" / "template not approved yet".
create table if not exists notification_outbox (
  id             uuid primary key default gen_random_uuid(),
  to_phone       text not null,                 -- E.164 digits (e.g. 918583021893)
  template_name  text not null,
  language       text not null default 'en',
  params         jsonb not null default '[]'::jsonb,  -- ordered body params
  audience       text not null default 'user' check (audience in ('user','support','admin')),
  status         text not null default 'queued'
                 check (status in ('queued','sent','failed','skipped')),
  related_type   text,                          -- 'ticket' | 'callback' | 'onboarding'
  related_id     uuid,
  attempts       int not null default 0,
  last_error     text,
  wamid          text,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz
);
create index if not exists notification_outbox_status_idx on notification_outbox (status, created_at);
alter table notification_outbox enable row level security;
drop policy if exists "outbox service_role" on notification_outbox;
create policy "outbox service_role" on notification_outbox for all to service_role using (true) with check (true);
-- (no user policy — outbox is platform-internal, service-role only)

-- ── 6. admin support overview: tickets + callbacks joined to profile email ──
create or replace view admin_support_overview as
  select 'ticket'::text as kind, t.id, t.user_id, p.email, p.full_name,
         t.subject as title, t.status, t.priority, t.category,
         t.contact_phone as phone, t.created_at, t.updated_at
  from support_tickets t left join profiles p on p.id = t.user_id
  union all
  select 'callback'::text as kind, c.id, c.user_id, p.email, p.full_name,
         coalesce(c.reason,'Callback request') as title, c.status, 'normal'::text as priority,
         'callback'::text as category, c.phone, c.created_at, c.updated_at
  from callback_requests c left join profiles p on p.id = c.user_id;
