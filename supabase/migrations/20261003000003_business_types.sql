-- Business type per account: drives which features/pages/journeys/integrations a business sees.
-- feature_overrides: admin-only per-account switches, e.g. {"orderguard": true, "leads": false}.

alter table public.profiles add column if not exists business_type text;
alter table public.profiles add column if not exists feature_overrides jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_business_type_check;
alter table public.profiles add constraint profiles_business_type_check
  check (business_type is null or business_type in ('ecommerce','clinics','education','real_estate','salons','finance','services','other'));

-- Users may set their own business type (signup / first-login prompt), but never their feature switches, role or active flag.
create or replace function public.profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('service_role', '') or coalesce(public.is_admin(), false) then
    return new;
  end if;
  new.role := old.role;
  new.is_active := old.is_active;
  new.id := old.id;
  new.email := old.email;
  new.feature_overrides := old.feature_overrides;
  return new;
end $$;

-- New signups: take business type from signup metadata when valid.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare bt text := nullif(new.raw_user_meta_data->>'business_type', '');
begin
  if bt is not null and bt not in ('ecommerce','clinics','education','real_estate','salons','finance','services','other') then bt := null; end if;
  insert into public.profiles (id, email, full_name, role, is_active, business_type)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'User'), 'user', true, bt);
  return new;
end $$;
