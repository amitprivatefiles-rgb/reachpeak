-- Add 'received' to messages status CHECK constraint.
-- Without this, inbound message inserts from whatsapp-webhook fail silently
-- because the webhook uses status='received' which is not in the constraint.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_status_check
  CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'received'));
