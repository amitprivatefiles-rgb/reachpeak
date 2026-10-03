-- Leads for non-e-commerce businesses (clinics, coaching, real estate, salons, finance, services…).
-- Sources: API / website forms / ads (event lead_created via ingest-event), manual entry in the dashboard, AI calls.
-- Every new lead fires a lead_created event so the business's "new lead" journey (instant WhatsApp, follow-ups) runs.

-- Allow the new non-e-commerce event types and journey presets (existing values unchanged).
alter table public.events drop constraint if exists events_event_type_check;
alter table public.events add constraint events_event_type_check check (event_type = any (array[
  'cart_abandoned','checkout_started','order_created','order_paid','order_shipped','order_delivered','order_cancelled',
  'customer_created','customer_updated','order_confirmed','order_rto','order_returned','order_refunded','prepay_nudge',
  'cod_pending','out_for_delivery','delivery_failed',
  'lead_created','appointment_booked','appointment_reminder','appointment_missed','appointment_completed',
  'payment_due','payment_overdue','renewal_due','call_completed']));
alter table public.journeys drop constraint if exists journeys_preset_check;
alter table public.journeys add constraint journeys_preset_check check (preset = any (array[
  'abandoned_cart','order_notifications','cod_confirm','welcome','custom','prepay_nudge',
  'lead_followup','appointment_confirm','appointment_missed','review_request','payment_reminder','renewal_reminder','after_call']));

create or replace function public.normalize_in_phone(p text) returns text language sql immutable as $$
  select case
    when p is null then null
    when length(regexp_replace(p, '\D', '', 'g')) = 10 then '91' || regexp_replace(p, '\D', '', 'g')
    when length(regexp_replace(p, '\D', '', 'g')) between 11 and 15 then regexp_replace(p, '\D', '', 'g')
    else null end
$$;

create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text,
  phone            text,
  email            text,
  source           text not null default 'manual',
  status           text not null default 'new' check (status in ('new','contacted','qualified','won','lost')),
  interest         text,
  value            numeric,
  notes            text not null default '',
  enquiry_count    integer not null default 1,
  last_activity_at timestamptz not null default now(),
  payload          jsonb not null default '{}'::jsonb,
  created_by       text not null default 'manual' check (created_by in ('manual','api','call')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint leads_text_limits check (char_length(coalesce(name,'')) <= 120 and char_length(coalesce(email,'')) <= 200
    and char_length(coalesce(interest,'')) <= 300 and char_length(notes) <= 4000 and char_length(source) <= 60)
);
create unique index if not exists leads_user_phone_uniq on public.leads (user_id, phone) where phone is not null;
create index if not exists leads_user_created_idx on public.leads (user_id, created_at desc);
create index if not exists leads_user_status_idx on public.leads (user_id, status);

alter table public.leads enable row level security;
drop policy if exists leads_own_select on public.leads;
drop policy if exists leads_own_insert on public.leads;
drop policy if exists leads_own_update on public.leads;
drop policy if exists leads_own_delete on public.leads;
create policy leads_own_select on public.leads for select using (user_id = auth.uid() or public.is_admin());
create policy leads_own_insert on public.leads for insert with check (user_id = auth.uid());
create policy leads_own_update on public.leads for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy leads_own_delete on public.leads for delete using (user_id = auth.uid() or public.is_admin());

-- Normalise + protect: users can't move a lead to another account or fake its origin.
create or replace function public.leads_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.phone := public.normalize_in_phone(new.phone);
  new.updated_at := now();
  if coalesce(auth.role(), '') not in ('service_role', '') and not coalesce(public.is_admin(), false) then
    if tg_op = 'INSERT' then new.created_by := 'manual'; end if;
    if tg_op = 'UPDATE' then new.user_id := old.user_id; new.created_by := old.created_by; end if;
  end if;
  return new;
end $$;
drop trigger if exists leads_guard on public.leads;
create trigger leads_guard before insert or update on public.leads for each row execute function public.leads_guard();

-- API / form / ad leads arrive as events (ingest-event) → create or bump the lead.
create or replace function public.leads_from_event() returns trigger language plpgsql security definer set search_path = public as $$
declare ph text := public.normalize_in_phone(new.contact_phone);
begin
  if new.event_type <> 'lead_created' or coalesce(new.payload->>'manual', '') = 'true' then return new; end if;
  if ph is null then
    insert into public.leads (user_id, name, email, source, interest, payload, created_by)
    values (new.user_id, coalesce(new.contact_name, new.payload->>'name'), new.payload->>'email',
            left(coalesce(new.payload->>'source', new.source, 'api'), 60), left(new.payload->>'interest', 300), coalesce(new.payload, '{}'::jsonb), 'api');
  else
    insert into public.leads (user_id, name, phone, email, source, interest, payload, created_by)
    values (new.user_id, coalesce(new.contact_name, new.payload->>'name'), ph, new.payload->>'email',
            left(coalesce(new.payload->>'source', new.source, 'api'), 60), left(new.payload->>'interest', 300), coalesce(new.payload, '{}'::jsonb), 'api')
    on conflict (user_id, phone) where phone is not null do update set
      enquiry_count = public.leads.enquiry_count + 1,
      last_activity_at = now(),
      name = coalesce(public.leads.name, excluded.name),
      email = coalesce(excluded.email, public.leads.email),
      interest = coalesce(excluded.interest, public.leads.interest),
      source = excluded.source,
      payload = excluded.payload,
      status = case when public.leads.status in ('won', 'lost') then 'new' else public.leads.status end;
  end if;
  return new;
exception when others then
  raise warning 'leads_from_event: %', sqlerrm; -- never block event ingestion
  return new;
end $$;
drop trigger if exists leads_from_event on public.events;
create trigger leads_from_event after insert on public.events for each row execute function public.leads_from_event();

-- A lead added by hand in the dashboard → lead_created event + start matching journeys (same path as API leads).
create or replace function public.leads_emit_event() returns trigger language plpgsql security definer set search_path = public as $$
declare ev uuid; k text;
begin
  if new.created_by <> 'manual' or new.phone is null then return new; end if;
  insert into public.events (user_id, source, event_type, contact_phone, contact_name, dedupe_key, payload, status)
  values (new.user_id, 'manual', 'lead_created', new.phone, new.name, 'lead:' || new.id,
          jsonb_build_object('manual', true, 'lead_id', new.id, 'name', new.name, 'email', new.email, 'source', new.source, 'interest', new.interest),
          'received')
  on conflict do nothing
  returning id into ev;
  if ev is not null then
    select value into k from public.internal_config where key = 'service_role_key';
    if k is not null then
      perform net.http_post(
        url := 'https://xykynbfsogwxecqzhfdm.supabase.co/functions/v1/journey-engine',
        headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
        body := jsonb_build_object('event_id', ev));
    end if;
  end if;
  return new;
exception when others then
  raise warning 'leads_emit_event: %', sqlerrm; -- never block saving the lead
  return new;
end $$;
drop trigger if exists leads_emit_event on public.leads;
create trigger leads_emit_event after insert on public.leads for each row execute function public.leads_emit_event();
alter publication supabase_realtime add table public.leads;

-- Voice server (service role only): a caller who phoned a business's AI line becomes / refreshes a lead.
create or replace function public.upsert_call_lead(p_user uuid, p_phone text, p_name text, p_summary text, p_outcome text)
returns void language plpgsql security definer set search_path = public as $$
declare ph text := public.normalize_in_phone(p_phone);
begin
  if ph is null then return; end if;
  insert into public.leads (user_id, name, phone, source, interest, payload, created_by)
  values (p_user, nullif(p_name, ''), ph, 'AI call', left(p_summary, 300), jsonb_build_object('outcome', p_outcome, 'summary', p_summary), 'call')
  on conflict (user_id, phone) where phone is not null do update set
    enquiry_count = public.leads.enquiry_count + 1,
    last_activity_at = now(),
    name = coalesce(public.leads.name, excluded.name),
    interest = coalesce(excluded.interest, public.leads.interest),
    payload = public.leads.payload || excluded.payload;
end $$;
revoke all on function public.upsert_call_lead(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.upsert_call_lead(uuid, text, text, text, text) to service_role;
