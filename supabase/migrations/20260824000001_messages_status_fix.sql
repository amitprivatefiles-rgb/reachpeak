-- Fix: wallet billing (partner-send) inserts messages with status 'pending_charge'
-- and later 'blocked_insufficient_balance', but messages_status_check didn't allow
-- them → EVERY partner-send enqueue failed ("violates check constraint"), so all
-- PeakCart order-update WhatsApp messages failed. Widen the allowed statuses.
alter table messages drop constraint if exists messages_status_check;
alter table messages add constraint messages_status_check
  check (status = any (array[
    'queued','sending','sent','delivered','read','failed','cancelled','received',
    'pending_charge','blocked_insufficient_balance'
  ]));
