-- ============================================================
-- Journeys — event-triggered automation engine
-- ============================================================

-- 1. Journey definitions
create table if not exists journeys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  preset          text check (preset in ('abandoned_cart','order_notifications','cod_confirm','welcome','custom')),
  trigger_event   text not null,
  trigger_filters jsonb not null default '{}'::jsonb,
  exit_on_events  text[] not null default '{}',
  steps           jsonb not null,
  is_active       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table journeys enable row level security;
create policy "own_journeys" on journeys for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Journey executions — live run state
create table if not exists journey_executions (
  id              uuid primary key default gen_random_uuid(),
  journey_id      uuid not null references journeys(id) on delete cascade,
  user_id         uuid not null,
  contact_phone   text not null,
  event_id        uuid references events(id),
  current_step    integer not null default 0,
  status          text not null default 'active'
    check (status in ('active','waiting_delay','waiting_reply','completed','exited_goal','cancelled','error')),
  wake_at         timestamptz,
  context         jsonb not null default '{}'::jsonb,
  error_message   text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);
-- one active run per journey per contact (prevents double-fires)
create unique index if not exists journey_exec_one_active
  on journey_executions (journey_id, contact_phone)
  where status in ('active','waiting_delay','waiting_reply');
create index if not exists journey_exec_wake_idx
  on journey_executions (wake_at)
  where status = 'waiting_delay';
alter table journey_executions enable row level security;
create policy "own_executions_read" on journey_executions for select
  using (auth.uid() = user_id);
-- Service role needs full access (engine runs as service role)
create policy "journey_exec_service_role" on journey_executions
  for all to service_role using (true) with check (true);

-- 3. Attribution on messages
alter table messages
  add column if not exists journey_execution_id uuid references journey_executions(id);
