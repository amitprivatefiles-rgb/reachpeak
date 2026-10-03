-- AI Calling is OFF for an account until the admin turns it on (after setting up its agent + number).
-- Businesses without access see a "Request AI Calling" page; requests land with the admin.

alter table public.voice_account_settings alter column calling_enabled set default false;

create table if not exists public.feature_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  feature     text not null check (feature in ('ai_calling')),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  details     jsonb not null default '{}'::jsonb,
  admin_note  text not null default '',
  decided_by  uuid,
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists feature_requests_one_pending on public.feature_requests (user_id, feature) where status = 'pending';
create index if not exists feature_requests_status_idx on public.feature_requests (status, created_at desc);

alter table public.feature_requests enable row level security;
drop policy if exists feature_requests_own_select on public.feature_requests;
drop policy if exists feature_requests_own_insert on public.feature_requests;
drop policy if exists feature_requests_admin_all on public.feature_requests;
create policy feature_requests_own_select on public.feature_requests for select using (user_id = auth.uid() or public.is_admin());
create policy feature_requests_own_insert on public.feature_requests for insert with check (user_id = auth.uid());
create policy feature_requests_admin_all on public.feature_requests for update using (public.is_admin()) with check (public.is_admin());

-- Businesses can only file a pending request for themselves; only admins decide.
create or replace function public.feature_requests_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if coalesce(auth.role(), '') not in ('service_role', '') and not coalesce(public.is_admin(), false) then
    new.status := 'pending'; new.admin_note := ''; new.decided_by := null; new.decided_at := null;
    new.details := coalesce(new.details, '{}'::jsonb);
    if length(new.details::text) > 4000 then raise exception 'request too long'; end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status <> 'pending' then
    new.decided_at := now(); new.decided_by := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists feature_requests_guard on public.feature_requests;
create trigger feature_requests_guard before insert or update on public.feature_requests for each row execute function public.feature_requests_guard();

-- Tell every admin (in-app notification) when a business asks for AI Calling.
create or replace function public.feature_requests_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select coalesce(nullif(full_name, ''), email) into who from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, title, message, type, is_read)
  select p.id, 'AI Calling requested', coalesce(who, 'A business') || ' asked for AI Calling. Open AI Calling Setup → Accounts to set it up.', 'system', false
  from public.profiles p where p.role = 'admin' and p.is_active;
  return new;
exception when others then
  raise warning 'feature_requests_notify: %', sqlerrm;
  return new;
end $$;
drop trigger if exists feature_requests_notify on public.feature_requests;
create trigger feature_requests_notify after insert on public.feature_requests for each row execute function public.feature_requests_notify();
