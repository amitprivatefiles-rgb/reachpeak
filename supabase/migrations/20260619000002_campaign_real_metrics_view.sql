-- Campaign real metrics view — computes stats from actual messages rows
-- CRITICAL: security_invoker = true ensures RLS is enforced per-caller
DROP VIEW IF EXISTS campaign_real_metrics;
CREATE VIEW campaign_real_metrics WITH (security_invoker = true) AS
SELECT
  m.campaign_id,
  m.user_id,
  COUNT(*) FILTER (WHERE m.status IN ('sent', 'delivered', 'read')) AS messages_sent,
  COUNT(*) FILTER (WHERE m.status = 'delivered') AS messages_delivered,
  COUNT(*) FILTER (WHERE m.status = 'read') AS messages_read,
  COUNT(*) FILTER (WHERE m.status = 'failed') AS messages_failed,
  COUNT(*) FILTER (WHERE m.status IN ('queued', 'sending')) AS messages_pending,
  COUNT(*) AS total_messages,
  CASE
    WHEN COUNT(*) FILTER (WHERE m.status NOT IN ('queued','sending')) > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE m.status IN ('delivered','read'))::numeric /
      COUNT(*) FILTER (WHERE m.status NOT IN ('queued','sending'))::numeric * 100, 2)
    ELSE 0
  END AS delivery_rate,
  CASE
    WHEN COUNT(*) FILTER (WHERE m.status NOT IN ('queued','sending')) > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE m.status = 'failed')::numeric /
      COUNT(*) FILTER (WHERE m.status NOT IN ('queued','sending'))::numeric * 100, 2)
    ELSE 0
  END AS failure_rate
FROM messages m
WHERE m.campaign_id IS NOT NULL
GROUP BY m.campaign_id, m.user_id;

-- The view uses security_invoker so RLS applies, but it still needs a
-- SELECT grant to be accessible via the PostgREST (Supabase client) API.
GRANT SELECT ON campaign_real_metrics TO authenticated;
