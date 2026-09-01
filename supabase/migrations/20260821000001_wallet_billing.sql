-- ============================================================
-- Wallet + Recharge Billing (Model C: prepaid wallet, founder's Meta card pays Meta)
-- Users prepay a wallet via Razorpay; each WhatsApp message debits a per-category price.
-- Fully idempotent — safe to re-run. Money code: atomic RPCs, no negative balances.
-- Designed to upgrade cleanly to BSP credit-line billing later (same wallet).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. wallets — one prepaid balance per user (in paise, integer money)
--    balance_paise = spendable, held_paise = reserved by in-flight messages
-- ────────────────────────────────────────────────────────────
create table if not exists wallets (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  balance_paise bigint not null default 0 check (balance_paise >= 0),
  held_paise    bigint not null default 0 check (held_paise >= 0),
  currency      text   not null default 'INR',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table wallets enable row level security;
drop policy if exists "own wallet read" on wallets;
create policy "own wallet read" on wallets for select using (auth.uid() = user_id);
drop policy if exists "wallets service_role" on wallets;
create policy "wallets service_role" on wallets for all to service_role using (true) with check (true);

-- ────────────────────────────────────────────────────────────
-- 2. wallet_transactions — immutable ledger. Every balance change is one row.
--    reference is the idempotency key per (user_id, type).
-- ────────────────────────────────────────────────────────────
create table if not exists wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('credit','debit','hold','release','adjust')),
  amount_paise  bigint not null check (amount_paise >= 0),
  balance_after bigint not null,   -- spendable balance after this txn
  held_after    bigint not null default 0,
  reference     text,              -- idempotency key (razorpay payment id, 'msg:<uuid>', 'admin:<uuid>')
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
-- Idempotency: at most one row per (user, type, reference) when reference is set.
create unique index if not exists wallet_tx_idem_idx
  on wallet_transactions (user_id, type, reference) where reference is not null;
create index if not exists wallet_tx_user_time_idx on wallet_transactions (user_id, created_at desc);
create index if not exists wallet_tx_ref_idx on wallet_transactions (reference) where reference is not null;
alter table wallet_transactions enable row level security;
drop policy if exists "own wallet tx read" on wallet_transactions;
create policy "own wallet tx read" on wallet_transactions for select using (auth.uid() = user_id);
drop policy if exists "wallet_tx service_role" on wallet_transactions;
create policy "wallet_tx service_role" on wallet_transactions for all to service_role using (true) with check (true);

-- ────────────────────────────────────────────────────────────
-- 3. message_pricing — admin-editable per-category price (paise). Founder's margin over Meta.
-- ────────────────────────────────────────────────────────────
create table if not exists message_pricing (
  category    text primary key check (category in ('marketing','utility','authentication','service')),
  price_paise bigint not null default 0 check (price_paise >= 0),
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);
-- Seed sensible defaults (₹0.88 marketing, ₹0.35 utility/auth, ₹0.00 service) — admin overrides in UI.
insert into message_pricing (category, price_paise) values
  ('marketing', 88),
  ('utility', 35),
  ('authentication', 35),
  ('service', 0)
on conflict (category) do nothing;
alter table message_pricing enable row level security;
drop policy if exists "pricing read all authed" on message_pricing;
create policy "pricing read all authed" on message_pricing for select to authenticated using (true);
drop policy if exists "pricing service_role" on message_pricing;
create policy "pricing service_role" on message_pricing for all to service_role using (true) with check (true);

-- ────────────────────────────────────────────────────────────
-- 4. platform_payment_providers — PLATFORM-level gateway config (founder collects FROM users).
--    Generalized so more gateways can be added later. Secrets live in Vault (UUID refs only).
--    Distinct from per-tenant `payment_providers` (OrderGuard COD→prepaid for merchants' own buyers).
-- ────────────────────────────────────────────────────────────
create table if not exists platform_payment_providers (
  id                 uuid primary key default gen_random_uuid(),
  gateway            text not null default 'razorpay' check (gateway in ('razorpay')),
  key_id             text not null,
  key_secret_enc     uuid not null,          -- vault.secrets.id
  webhook_secret_enc uuid,                   -- vault.secrets.id (nullable until webhook configured)
  mode               text not null default 'live' check (mode in ('live','test')),
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (gateway)
);
alter table platform_payment_providers enable row level security;
-- No public/authenticated policy: only service_role (edge functions) may touch platform keys.
drop policy if exists "platform_pp service_role" on platform_payment_providers;
create policy "platform_pp service_role" on platform_payment_providers for all to service_role using (true) with check (true);
-- Safe public view — admin UI reads ONLY this (no secret columns).
create or replace view platform_payment_providers_public as
  select id, gateway, key_id, mode, is_active,
         (webhook_secret_enc is not null) as webhook_configured,
         created_at, updated_at
  from platform_payment_providers;

-- ────────────────────────────────────────────────────────────
-- 5. wallet_recharges — one row per Razorpay top-up order. Idempotent credit + GST receipt/history.
-- ────────────────────────────────────────────────────────────
create table if not exists wallet_recharges (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  gateway        text not null default 'razorpay',
  rzp_order_id   text unique,
  rzp_payment_id text,
  amount_paise   bigint not null check (amount_paise > 0),
  currency       text not null default 'INR',
  status         text not null default 'created' check (status in ('created','paid','failed')),
  receipt        text,                       -- our receipt id (wlt_<short>)
  credited_tx_id uuid references wallet_transactions(id),
  meta           jsonb not null default '{}'::jsonb,  -- gst fields, contact, notes
  created_at     timestamptz not null default now(),
  paid_at        timestamptz
);
create index if not exists wallet_recharges_user_idx on wallet_recharges (user_id, created_at desc);
alter table wallet_recharges enable row level security;
drop policy if exists "own recharges read" on wallet_recharges;
create policy "own recharges read" on wallet_recharges for select using (auth.uid() = user_id);
drop policy if exists "recharges service_role" on wallet_recharges;
create policy "recharges service_role" on wallet_recharges for all to service_role using (true) with check (true);

-- ============================================================
-- ATOMIC WALLET RPCs (service-role only). All lock the wallet row FOR UPDATE.
-- ============================================================

-- Ensure a wallet row exists (called inside the money fns under lock context).
create or replace function _wallet_ensure(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into wallets (user_id) values (p_user) on conflict (user_id) do nothing;
end; $$;

-- ── CREDIT: add funds (recharge success, admin top-up). Idempotent on (user,'credit',ref). ──
create or replace function wallet_credit(p_user uuid, p_amount bigint, p_reference text, p_meta jsonb default '{}'::jsonb, p_type text default 'credit')
returns wallet_transactions language plpgsql security definer set search_path = public as $$
declare w wallets; tx wallet_transactions;
begin
  if p_amount <= 0 then raise exception 'amount_must_be_positive'; end if;
  if p_type not in ('credit','adjust') then raise exception 'bad_credit_type'; end if;

  -- Idempotency: if this reference was already credited, return the existing txn.
  if p_reference is not null then
    select * into tx from wallet_transactions
      where user_id = p_user and type = p_type and reference = p_reference limit 1;
    if found then return tx; end if;
  end if;

  perform _wallet_ensure(p_user);
  select * into w from wallets where user_id = p_user for update;

  update wallets set balance_paise = balance_paise + p_amount, updated_at = now()
    where user_id = p_user returning * into w;

  insert into wallet_transactions (user_id, type, amount_paise, balance_after, held_after, reference, meta)
    values (p_user, p_type, p_amount, w.balance_paise, w.held_paise, p_reference, coalesce(p_meta,'{}'::jsonb))
    returning * into tx;
  return tx;
exception when unique_violation then
  -- Concurrent duplicate credit — return the row that won.
  select * into tx from wallet_transactions
    where user_id = p_user and type = p_type and reference = p_reference limit 1;
  return tx;
end; $$;

-- ── HOLD: reserve funds for an in-flight message. Raises 'insufficient_balance' if short. ──
--    Moves money balance→held so it can't be spent twice. Idempotent on (user,'hold',ref).
create or replace function wallet_hold(p_user uuid, p_amount bigint, p_reference text, p_meta jsonb default '{}'::jsonb)
returns wallet_transactions language plpgsql security definer set search_path = public as $$
declare w wallets; tx wallet_transactions;
begin
  if p_amount < 0 then raise exception 'amount_must_be_nonneg'; end if;

  if p_reference is not null then
    select * into tx from wallet_transactions
      where user_id = p_user and type = 'hold' and reference = p_reference limit 1;
    if found then return tx; end if;
  end if;

  perform _wallet_ensure(p_user);
  select * into w from wallets where user_id = p_user for update;

  if w.balance_paise < p_amount then
    raise exception 'insufficient_balance' using errcode = 'P0001',
      detail = format('balance=%s required=%s', w.balance_paise, p_amount);
  end if;

  update wallets set balance_paise = balance_paise - p_amount,
                     held_paise = held_paise + p_amount, updated_at = now()
    where user_id = p_user returning * into w;

  insert into wallet_transactions (user_id, type, amount_paise, balance_after, held_after, reference, meta)
    values (p_user, 'hold', p_amount, w.balance_paise, w.held_paise, p_reference, coalesce(p_meta,'{}'::jsonb))
    returning * into tx;
  return tx;
end; $$;

-- ── SETTLE: finalize a hold as a real spend (message sent). held-=amount, money gone. ──
--    Amount taken from the original hold record → authoritative. Idempotent per ref.
create or replace function wallet_settle(p_reference text, p_meta jsonb default '{}'::jsonb)
returns wallet_transactions language plpgsql security definer set search_path = public as $$
declare hold_tx wallet_transactions; w wallets; tx wallet_transactions; v_amount bigint; v_user uuid;
begin
  if p_reference is null then raise exception 'reference_required'; end if;

  -- Already settled?
  select * into tx from wallet_transactions where type = 'debit' and reference = p_reference limit 1;
  if found then return tx; end if;

  select * into hold_tx from wallet_transactions where type = 'hold' and reference = p_reference limit 1;
  if not found then
    -- No hold to settle (already released, or never held) → no-op, return null row.
    return null;
  end if;
  v_amount := hold_tx.amount_paise; v_user := hold_tx.user_id;
  if v_amount = 0 then return hold_tx; end if;

  select * into w from wallets where user_id = v_user for update;
  update wallets set held_paise = greatest(0, held_paise - v_amount), updated_at = now()
    where user_id = v_user returning * into w;

  insert into wallet_transactions (user_id, type, amount_paise, balance_after, held_after, reference, meta)
    values (v_user, 'debit', v_amount, w.balance_paise, w.held_paise, p_reference, coalesce(p_meta,'{}'::jsonb))
    returning * into tx;
  return tx;
exception when unique_violation then
  select * into tx from wallet_transactions where type = 'debit' and reference = p_reference limit 1;
  return tx;
end; $$;

-- ── RELEASE: refund a hold (message failed / cancelled). held→balance. Idempotent per ref. ──
create or replace function wallet_release(p_reference text, p_meta jsonb default '{}'::jsonb)
returns wallet_transactions language plpgsql security definer set search_path = public as $$
declare hold_tx wallet_transactions; w wallets; tx wallet_transactions; v_amount bigint; v_user uuid;
begin
  if p_reference is null then raise exception 'reference_required'; end if;

  -- Already released or already settled → do not double-refund.
  select * into tx from wallet_transactions where type = 'release' and reference = p_reference limit 1;
  if found then return tx; end if;
  perform 1 from wallet_transactions where type = 'debit' and reference = p_reference limit 1;
  if found then
    select * into tx from wallet_transactions where type = 'debit' and reference = p_reference limit 1;
    return tx;  -- money already spent; nothing to refund
  end if;

  select * into hold_tx from wallet_transactions where type = 'hold' and reference = p_reference limit 1;
  if not found then return null; end if;
  v_amount := hold_tx.amount_paise; v_user := hold_tx.user_id;

  select * into w from wallets where user_id = v_user for update;
  update wallets set held_paise = greatest(0, held_paise - v_amount),
                     balance_paise = balance_paise + v_amount, updated_at = now()
    where user_id = v_user returning * into w;

  insert into wallet_transactions (user_id, type, amount_paise, balance_after, held_after, reference, meta)
    values (v_user, 'release', v_amount, w.balance_paise, w.held_paise, p_reference, coalesce(p_meta,'{}'::jsonb))
    returning * into tx;
  return tx;
exception when unique_violation then
  select * into tx from wallet_transactions where type = 'release' and reference = p_reference limit 1;
  return tx;
end; $$;

-- ── DIRECT DEBIT: spend without a prior hold (kept for completeness / manual adjust). ──
create or replace function wallet_debit(p_user uuid, p_amount bigint, p_reference text, p_meta jsonb default '{}'::jsonb)
returns wallet_transactions language plpgsql security definer set search_path = public as $$
declare w wallets; tx wallet_transactions;
begin
  if p_amount < 0 then raise exception 'amount_must_be_nonneg'; end if;
  if p_reference is not null then
    select * into tx from wallet_transactions where user_id = p_user and type = 'debit' and reference = p_reference limit 1;
    if found then return tx; end if;
  end if;
  perform _wallet_ensure(p_user);
  select * into w from wallets where user_id = p_user for update;
  if w.balance_paise < p_amount then
    raise exception 'insufficient_balance' using errcode = 'P0001',
      detail = format('balance=%s required=%s', w.balance_paise, p_amount);
  end if;
  update wallets set balance_paise = balance_paise - p_amount, updated_at = now()
    where user_id = p_user returning * into w;
  insert into wallet_transactions (user_id, type, amount_paise, balance_after, held_after, reference, meta)
    values (p_user, 'debit', p_amount, w.balance_paise, w.held_paise, p_reference, coalesce(p_meta,'{}'::jsonb))
    returning * into tx;
  return tx;
end; $$;

-- Lock down execution: service-role only (edge functions / worker use service key).
do $$
declare fn text;
begin
  foreach fn in array array[
    'wallet_credit(uuid,bigint,text,jsonb,text)',
    'wallet_hold(uuid,bigint,text,jsonb)',
    'wallet_settle(text,jsonb)',
    'wallet_release(text,jsonb)',
    'wallet_debit(uuid,bigint,text,jsonb)',
    '_wallet_ensure(uuid)'
  ] loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('revoke execute on function %s from authenticated', fn);
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────
-- 6. messages: interim charge status so the worker never sends an unpaid message.
--    'queued' = paid+ready (worker claims this). 'pending_charge'/'blocked_insufficient_balance' are NOT claimed.
--    (No enum change needed — messages.status is text; claim_queued_messages filters status='queued'.)
-- ────────────────────────────────────────────────────────────
-- charge bookkeeping columns (optional, for reporting; settle/release key off the hold ref)
alter table messages add column if not exists charge_paise    bigint;
alter table messages add column if not exists charge_category  text;

-- ────────────────────────────────────────────────────────────
-- 7. Admin oversight view — wallet balances + spend, joined to profile email.
-- ────────────────────────────────────────────────────────────
create or replace view admin_wallet_overview as
  select
    w.user_id,
    p.email,
    p.full_name,
    w.balance_paise,
    w.held_paise,
    coalesce(spent.total_debit, 0)  as spent_paise,
    coalesce(spent.msg_count, 0)    as messages_charged,
    coalesce(topup.total_credit, 0) as recharged_paise,
    w.updated_at
  from wallets w
  left join profiles p on p.id = w.user_id
  left join (
    select user_id, sum(amount_paise) total_debit, count(*) msg_count
    from wallet_transactions where type = 'debit' group by user_id
  ) spent on spent.user_id = w.user_id
  left join (
    select user_id, sum(amount_paise) total_credit
    from wallet_transactions where type in ('credit','adjust') group by user_id
  ) topup on topup.user_id = w.user_id;
