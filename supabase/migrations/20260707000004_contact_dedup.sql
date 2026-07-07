-- ============================================================
-- Contact deduplication + unique index
-- REVIEW BEFORE RUNNING — deletes ~687 duplicate contact rows
-- after re-pointing ALL FK references to the surviving (newest) row.
--
-- FK tables handled: messages, contact_tags, campaign_contacts, failed_messages
-- Survivor = most recently updated row per (user_id, phone_number)
-- ============================================================

-- Helper: inline survivor subquery used by every step
-- (select distinct on (user_id, phone_number) id, user_id, phone_number
--  from contacts where phone_number is not null
--  order by user_id, phone_number, updated_at desc nulls last, id desc)

-- ── Step 1: Re-point messages.contact_id ──
update messages m
set contact_id = surv.id
from contacts c
join (
  select distinct on (user_id, phone_number) id, user_id, phone_number
  from contacts where phone_number is not null
  order by user_id, phone_number, updated_at desc nulls last, id desc
) surv on surv.user_id = c.user_id and surv.phone_number = c.phone_number
where m.contact_id = c.id
  and c.id != surv.id
  and c.phone_number is not null;

-- ── Step 2: Re-point failed_messages.contact_id ──
update failed_messages fm
set contact_id = surv.id
from contacts c
join (
  select distinct on (user_id, phone_number) id, user_id, phone_number
  from contacts where phone_number is not null
  order by user_id, phone_number, updated_at desc nulls last, id desc
) surv on surv.user_id = c.user_id and surv.phone_number = c.phone_number
where fm.contact_id = c.id
  and c.id != surv.id
  and c.phone_number is not null;

-- ── Step 3: Re-point campaign_contacts.contact_id ──
-- campaign_contacts has UNIQUE(campaign_id, contact_id) — delete would-be conflicts first
delete from campaign_contacts cc
using contacts c
join (
  select distinct on (user_id, phone_number) id, user_id, phone_number
  from contacts where phone_number is not null
  order by user_id, phone_number, updated_at desc nulls last, id desc
) surv on surv.user_id = c.user_id and surv.phone_number = c.phone_number
where cc.contact_id = c.id
  and c.id != surv.id
  and c.phone_number is not null
  and exists (
    select 1 from campaign_contacts x
    where x.campaign_id = cc.campaign_id and x.contact_id = surv.id
  );

-- Now re-point remaining campaign_contacts
update campaign_contacts cc
set contact_id = surv.id
from contacts c
join (
  select distinct on (user_id, phone_number) id, user_id, phone_number
  from contacts where phone_number is not null
  order by user_id, phone_number, updated_at desc nulls last, id desc
) surv on surv.user_id = c.user_id and surv.phone_number = c.phone_number
where cc.contact_id = c.id
  and c.id != surv.id
  and c.phone_number is not null;

-- ── Step 4: Re-point contact_tags.contact_id ──
-- contact_tags has UNIQUE(contact_id, tag_id) — delete would-be conflicts first
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'contact_tags') then
    -- Delete contact_tags that would violate unique after re-point
    execute '
      delete from contact_tags ct
      using contacts c
      join (
        select distinct on (user_id, phone_number) id, user_id, phone_number
        from contacts where phone_number is not null
        order by user_id, phone_number, updated_at desc nulls last, id desc
      ) surv on surv.user_id = c.user_id and surv.phone_number = c.phone_number
      where ct.contact_id = c.id
        and c.id != surv.id
        and c.phone_number is not null
        and exists (
          select 1 from contact_tags x
          where x.contact_id = surv.id and x.tag_id = ct.tag_id
        )
    ';
    -- Re-point remaining
    execute '
      update contact_tags ct
      set contact_id = surv.id
      from contacts c
      join (
        select distinct on (user_id, phone_number) id, user_id, phone_number
        from contacts where phone_number is not null
        order by user_id, phone_number, updated_at desc nulls last, id desc
      ) surv on surv.user_id = c.user_id and surv.phone_number = c.phone_number
      where ct.contact_id = c.id
        and c.id != surv.id
        and c.phone_number is not null
    ';
  end if;
end $$;

-- ── Step 5: Delete duplicate contacts (all non-survivor rows) ──
delete from contacts c
using (
  select distinct on (user_id, phone_number) id, user_id, phone_number
  from contacts where phone_number is not null
  order by user_id, phone_number, updated_at desc nulls last, id desc
) surv
where c.user_id = surv.user_id
  and c.phone_number = surv.phone_number
  and c.id != surv.id
  and c.phone_number is not null;

-- ── Step 6: Create unique index ──
create unique index if not exists contacts_user_phone_idx
  on contacts (user_id, phone_number)
  where phone_number is not null;
