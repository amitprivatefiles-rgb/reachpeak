-- Security fixes found 2026-10-03.
-- 1) eshipz_raw_log + shopify_product_images had NO row-level security: anyone with the public app key could read them.
-- 2) profiles: any signed-in user could read every profile, and could UPDATE their own role (→ admin) / is_active.

-- 1a. Courier webhook log: server-only (eshipz-webhook / event pipeline use the service role).
alter table public.eshipz_raw_log enable row level security;
revoke all on public.eshipz_raw_log from anon, authenticated;
drop policy if exists eshipz_raw_log_service_role on public.eshipz_raw_log;
create policy eshipz_raw_log_service_role on public.eshipz_raw_log for all to service_role using (true) with check (true);

-- 1b. Product images: each business reads only its own (AI Broadcast); writes stay server-side.
alter table public.shopify_product_images enable row level security;
revoke all on public.shopify_product_images from anon;
revoke insert, update, delete on public.shopify_product_images from authenticated;
drop policy if exists shopify_product_images_own_select on public.shopify_product_images;
drop policy if exists shopify_product_images_service_role on public.shopify_product_images;
create policy shopify_product_images_own_select on public.shopify_product_images for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy shopify_product_images_service_role on public.shopify_product_images for all to service_role using (true) with check (true);

-- 2a. Profiles: users see only themselves; admins see all.
drop policy if exists "Users can view all profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());

-- 2b. Users may edit their own profile, but never their role, active flag or id/email.
create or replace function public.profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- trusted: service role, admins, direct DB sessions (no request JWT)
  if coalesce(auth.role(), '') in ('service_role', '') or coalesce(public.is_admin(), false) then
    return new;
  end if;
  new.role := old.role;
  new.is_active := old.is_active;
  new.id := old.id;
  new.email := old.email;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();
