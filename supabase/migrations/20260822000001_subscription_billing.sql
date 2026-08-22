-- ============================================================
-- Subscription billing via Razorpay (direct reachpeakapi.in signups only).
-- Direct signups must pay a plan to activate. PeakCart/managed accounts already
-- get an active ₹0 subscription at provision time, so they're exempt automatically.
-- Idempotent.
-- ============================================================

-- Track the Razorpay order that paid for a subscription (webhook matches on this).
alter table subscriptions add column if not exists rzp_order_id   text;
alter table subscriptions add column if not exists rzp_payment_id text;
create index if not exists subscriptions_rzp_order_idx on subscriptions (rzp_order_id) where rzp_order_id is not null;
