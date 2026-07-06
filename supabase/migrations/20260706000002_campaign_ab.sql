-- ============================================================
-- A/B Campaign Testing — schema + metrics view
-- ============================================================

-- Campaigns: A/B config columns
alter table campaigns
  add column if not exists ab_enabled boolean not null default false,
  add column if not exists ab_split   integer not null default 50
    check (ab_split between 10 and 90),
  add column if not exists variant_b  jsonb;
  -- variant_b shape: { template_id, template_language, variable_mapping,
  --                    message_template, header_override_url }

-- Messages: per-row variant stamp
alter table messages
  add column if not exists variant text check (variant in ('A','B'));

-- Per-variant metrics view (mirrors campaign_real_metrics but sliced by variant)
create or replace view campaign_variant_metrics
with (security_invoker = true) as
select
  m.campaign_id,
  m.user_id,
  m.variant,
  count(*) as total,
  count(*) filter (where m.status in ('sent','delivered','read')) as sent,
  count(*) filter (where m.status = 'delivered') as delivered,
  count(*) filter (where m.status = 'read') as "read",
  count(*) filter (where m.status = 'failed') as failed
from messages m
where m.campaign_id is not null
  and m.variant is not null
group by m.campaign_id, m.user_id, m.variant;

grant select on campaign_variant_metrics to authenticated;
