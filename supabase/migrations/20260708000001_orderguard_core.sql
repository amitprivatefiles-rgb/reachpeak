-- ============================================================
-- OrderGuard Core — order tracking + risk scoring + routing
-- Fully idempotent — safe to re-run
-- ============================================================

-- 1. Orders — full lifecycle tracking
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  source          text not null,
  external_order_id text not null,
  contact_id      uuid references contacts(id) on delete set null,
  contact_phone   text,
  total           numeric(12,2),
  currency        text default 'INR',
  payment_method  text,
  is_cod          boolean not null default false,
  items           jsonb not null default '[]'::jsonb,
  address_line    text,
  address_city    text,
  address_state   text,
  address_pincode text,
  status          text not null default 'created' check (status in
    ('created','confirmed','cancelled_by_customer','cancelled','shipped',
     'delivered','rto','returned','refunded')),
  risk_score      integer,
  risk_band       text check (risk_band in ('low','medium','high')),
  risk_factors    jsonb,
  routed_action   text,
  confirm_status  text check (confirm_status in ('pending','confirmed','declined','no_response')),
  created_at      timestamptz not null default now(),
  confirmed_at    timestamptz,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  closed_at       timestamptz,
  updated_at      timestamptz not null default now(),
  unique (user_id, source, external_order_id)
);
create index if not exists orders_user_status_idx on orders (user_id, status, created_at desc);
create index if not exists orders_phone_idx on orders (user_id, contact_phone);
alter table orders enable row level security;
drop policy if exists "own orders" on orders;
create policy "own orders" on orders for select using (auth.uid() = user_id);
drop policy if exists "orders_service_role" on orders;
create policy "orders_service_role" on orders
  for all to service_role using (true) with check (true);

-- 2. Customer stats — per-customer rollups (scoring memory)
create table if not exists customer_stats (
  user_id         uuid not null,
  contact_phone   text not null,
  total_orders    integer not null default 0,
  delivered       integer not null default 0,
  rto             integer not null default 0,
  cancelled       integer not null default 0,
  cod_orders      integer not null default 0,
  prepaid_orders  integer not null default 0,
  total_value     numeric(14,2) not null default 0,
  cod_confirms    integer not null default 0,
  cod_declines    integer not null default 0,
  cod_ignores     integer not null default 0,
  last_order_at   timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (user_id, contact_phone)
);
alter table customer_stats enable row level security;
drop policy if exists "own stats" on customer_stats;
create policy "own stats" on customer_stats for select using (auth.uid() = user_id);
drop policy if exists "customer_stats_service_role" on customer_stats;
create policy "customer_stats_service_role" on customer_stats
  for all to service_role using (true) with check (true);

-- 3. Pincode stats — regional risk rollups
create table if not exists pincode_stats (
  user_id    uuid not null,
  pincode    text not null,
  orders     integer not null default 0,
  delivered  integer not null default 0,
  rto        integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, pincode)
);
alter table pincode_stats enable row level security;
drop policy if exists "own pincodes" on pincode_stats;
create policy "own pincodes" on pincode_stats for select using (auth.uid() = user_id);
drop policy if exists "pincode_stats_service_role" on pincode_stats;
create policy "pincode_stats_service_role" on pincode_stats
  for all to service_role using (true) with check (true);

-- 4. OrderGuard settings — per-tenant config
create table if not exists orderguard_settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  enabled          boolean not null default false,
  score_cod_only   boolean not null default true,
  low_max          integer not null default 39,
  medium_max       integer not null default 69,
  action_low       text not null default 'none',
  action_medium    text not null default 'cod_confirm',
  action_high      text not null default 'prepay_nudge',
  cod_confirm_journey_id uuid references journeys(id) on delete set null,
  prepay_journey_id      uuid references journeys(id) on delete set null,
  hold_callback    boolean not null default false,
  updated_at       timestamptz not null default now()
);
alter table orderguard_settings enable row level security;
drop policy if exists "own og settings" on orderguard_settings;
create policy "own og settings" on orderguard_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Extend events.event_type CHECK — add lifecycle + prepay_nudge
alter table events drop constraint if exists events_event_type_check;
alter table events add constraint events_event_type_check check (event_type in (
  'cart_abandoned','checkout_started','order_created','order_paid',
  'order_shipped','order_delivered','order_cancelled','cod_pending',
  'customer_created','custom',
  'order_confirmed','order_rto','order_returned','order_refunded','prepay_nudge'
));

-- 6. Extend journeys preset CHECK to include prepay_nudge
alter table journeys drop constraint if exists journeys_preset_check;
alter table journeys add constraint journeys_preset_check check (preset in (
  'abandoned_cart','order_notifications','cod_confirm','welcome','custom','prepay_nudge'
));
