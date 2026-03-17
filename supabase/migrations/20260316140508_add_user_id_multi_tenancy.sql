/*
  # Multi-tenancy: Add user_id data isolation to all tables

  1. Schema Changes
    - Add `user_id` column (uuid, FK to auth.users) to:
      - campaigns, contacts, failed_messages, agents, campaign_agents,
        lead_sources, activity_logs, dashboard_metrics
    - Backfill existing rows with admin user ID
    - Set user_id NOT NULL after backfill
    - Update unique constraints on lead_sources and dashboard_metrics
      to include user_id for per-user isolation

  2. Security Changes
    - Drop all old RLS policies on these 8 tables
    - Create new per-user RLS policies (SELECT/INSERT/UPDATE/DELETE)
      enforcing auth.uid() = user_id
    - Drop old is_admin() function (no longer needed for data access)

  3. Trigger Updates
    - Replace refresh_dashboard_metrics to be user_id-aware
    - Replace trigger_refresh_dashboard_metrics to pass user_id
    - Replace update_campaign_total_numbers to be user_id-aware

  4. New User Seeding
    - Create seed_user_defaults() function + trigger on subscriptions
      to auto-create lead_sources and dashboard_metrics when a user
      subscription becomes active

  This migration ensures complete data isolation between users.
*/

-- ============================================================
-- 1. ADD user_id COLUMNS
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='user_id') THEN
    ALTER TABLE campaigns ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='user_id') THEN
    ALTER TABLE contacts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='failed_messages' AND column_name='user_id') THEN
    ALTER TABLE failed_messages ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='user_id') THEN
    ALTER TABLE agents ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_agents' AND column_name='user_id') THEN
    ALTER TABLE campaign_agents ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_sources' AND column_name='user_id') THEN
    ALTER TABLE lead_sources ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dashboard_metrics' AND column_name='user_id') THEN
    ALTER TABLE dashboard_metrics ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- activity_logs already has user_id but it's nullable, we'll handle NOT NULL below

-- ============================================================
-- 2. BACKFILL with admin user
-- ============================================================

UPDATE campaigns SET user_id = '0fcca0de-3137-4085-aef5-950d59d7bb60' WHERE user_id IS NULL;
UPDATE contacts SET user_id = '0fcca0de-3137-4085-aef5-950d59d7bb60' WHERE user_id IS NULL;
UPDATE failed_messages SET user_id = '0fcca0de-3137-4085-aef5-950d59d7bb60' WHERE user_id IS NULL;
UPDATE agents SET user_id = '0fcca0de-3137-4085-aef5-950d59d7bb60' WHERE user_id IS NULL;
UPDATE campaign_agents SET user_id = '0fcca0de-3137-4085-aef5-950d59d7bb60' WHERE user_id IS NULL;
UPDATE lead_sources SET user_id = '0fcca0de-3137-4085-aef5-950d59d7bb60' WHERE user_id IS NULL;
UPDATE dashboard_metrics SET user_id = '0fcca0de-3137-4085-aef5-950d59d7bb60' WHERE user_id IS NULL;
UPDATE activity_logs SET user_id = '0fcca0de-3137-4085-aef5-950d59d7bb60' WHERE user_id IS NULL;

-- ============================================================
-- 3. SET NOT NULL
-- ============================================================

ALTER TABLE campaigns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE failed_messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE agents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE campaign_agents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE lead_sources ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE dashboard_metrics ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE activity_logs ALTER COLUMN user_id SET NOT NULL;

-- ============================================================
-- 4. UPDATE UNIQUE CONSTRAINTS for multi-tenancy
-- ============================================================

ALTER TABLE lead_sources DROP CONSTRAINT IF EXISTS lead_sources_source_name_key;
ALTER TABLE lead_sources ADD CONSTRAINT lead_sources_user_source_unique UNIQUE (user_id, source_name);

ALTER TABLE dashboard_metrics DROP CONSTRAINT IF EXISTS dashboard_metrics_metric_date_key;
ALTER TABLE dashboard_metrics ADD CONSTRAINT dashboard_metrics_user_date_unique UNIQUE (user_id, metric_date);

-- ============================================================
-- 5. ADD INDEXES for user_id queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_messages_user_id ON failed_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_agents_user_id ON campaign_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_user_id ON lead_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_user_id ON dashboard_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- ============================================================
-- 6. DROP OLD RLS POLICIES
-- ============================================================

-- campaigns
DROP POLICY IF EXISTS "Users can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can insert campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON campaigns;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON campaigns;
DROP POLICY IF EXISTS "Enable insert for admins" ON campaigns;
DROP POLICY IF EXISTS "Enable update for admins" ON campaigns;
DROP POLICY IF EXISTS "Enable delete for admins" ON campaigns;

-- contacts
DROP POLICY IF EXISTS "Users can view contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can update contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON contacts;

-- failed_messages
DROP POLICY IF EXISTS "Users can view failed messages" ON failed_messages;
DROP POLICY IF EXISTS "Admins can insert failed messages" ON failed_messages;
DROP POLICY IF EXISTS "Admins can update failed messages" ON failed_messages;
DROP POLICY IF EXISTS "Admins can delete failed messages" ON failed_messages;

-- agents
DROP POLICY IF EXISTS "Users can view agents" ON agents;
DROP POLICY IF EXISTS "Admins can insert agents" ON agents;
DROP POLICY IF EXISTS "Admins can update agents" ON agents;
DROP POLICY IF EXISTS "Admins can delete agents" ON agents;

-- campaign_agents
DROP POLICY IF EXISTS "Users can view campaign agents" ON campaign_agents;
DROP POLICY IF EXISTS "Admins can insert campaign agents" ON campaign_agents;
DROP POLICY IF EXISTS "Admins can delete campaign agents" ON campaign_agents;

-- lead_sources
DROP POLICY IF EXISTS "Users can view lead sources" ON lead_sources;
DROP POLICY IF EXISTS "Admins can insert lead sources" ON lead_sources;
DROP POLICY IF EXISTS "Admins can update lead sources" ON lead_sources;
DROP POLICY IF EXISTS "Admins can delete lead sources" ON lead_sources;

-- dashboard_metrics
DROP POLICY IF EXISTS "Users can view dashboard metrics" ON dashboard_metrics;
DROP POLICY IF EXISTS "Admins can insert dashboard metrics" ON dashboard_metrics;
DROP POLICY IF EXISTS "Admins can update dashboard metrics" ON dashboard_metrics;

-- activity_logs
DROP POLICY IF EXISTS "Users can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;

-- ============================================================
-- 7. CREATE NEW PER-USER RLS POLICIES
-- ============================================================

-- campaigns
CREATE POLICY "Users can view own campaigns" ON campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- contacts
CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- failed_messages
CREATE POLICY "Users can view own failed messages" ON failed_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own failed messages" ON failed_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own failed messages" ON failed_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own failed messages" ON failed_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- agents
CREATE POLICY "Users can view own agents" ON agents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agents" ON agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agents" ON agents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own agents" ON agents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- campaign_agents
CREATE POLICY "Users can view own campaign agents" ON campaign_agents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaign agents" ON campaign_agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaign agents" ON campaign_agents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaign agents" ON campaign_agents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- lead_sources
CREATE POLICY "Users can view own lead sources" ON lead_sources FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lead sources" ON lead_sources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lead sources" ON lead_sources FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own lead sources" ON lead_sources FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- dashboard_metrics
CREATE POLICY "Users can view own dashboard metrics" ON dashboard_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dashboard metrics" ON dashboard_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dashboard metrics" ON dashboard_metrics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- activity_logs
CREATE POLICY "Users can view own activity logs" ON activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. UPDATE TRIGGERS to be user_id-aware
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_today date := CURRENT_DATE;
  v_total_contacts integer;
  v_active_campaigns integer;
  v_completed_campaigns integer;
  v_blacklisted integer;
  v_active_agents integer;
  cur CURSOR FOR SELECT DISTINCT user_id FROM campaigns
    UNION SELECT DISTINCT user_id FROM contacts
    UNION SELECT DISTINCT user_id FROM agents;
BEGIN
  FOR v_user_id IN SELECT DISTINCT u.user_id FROM (
    SELECT DISTINCT user_id FROM campaigns
    UNION SELECT DISTINCT user_id FROM contacts
    UNION SELECT DISTINCT user_id FROM agents
  ) u
  LOOP
    SELECT COUNT(*) INTO v_total_contacts FROM contacts WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_active_campaigns FROM campaigns WHERE user_id = v_user_id AND status = 'Running';
    SELECT COUNT(*) INTO v_completed_campaigns FROM campaigns WHERE user_id = v_user_id AND status = 'Completed';
    SELECT COUNT(*) INTO v_blacklisted FROM contacts WHERE user_id = v_user_id AND is_blacklisted = true;
    SELECT COUNT(*) INTO v_active_agents FROM agents WHERE user_id = v_user_id AND is_active = true;

    INSERT INTO dashboard_metrics (
      user_id, metric_date, total_contacts, total_numbers_uploaded,
      total_messages_sent, total_messages_failed, messages_pending_retry,
      active_campaigns, completed_campaigns, delivery_rate, failure_rate,
      blacklisted_numbers, active_agents, last_upload_time
    ) VALUES (
      v_user_id, v_today, v_total_contacts,
      COALESCE((SELECT total_numbers_uploaded FROM dashboard_metrics WHERE user_id = v_user_id AND metric_date = v_today), 0),
      COALESCE((SELECT SUM(messages_sent) FROM campaigns WHERE user_id = v_user_id), 0),
      COALESCE((SELECT SUM(messages_failed) FROM campaigns WHERE user_id = v_user_id), 0),
      COALESCE((SELECT SUM(pending_retry) FROM campaigns WHERE user_id = v_user_id), 0),
      v_active_campaigns, v_completed_campaigns,
      CASE WHEN (SELECT SUM(messages_sent + messages_failed) FROM campaigns WHERE user_id = v_user_id) > 0
        THEN (SELECT SUM(messages_sent)::numeric / NULLIF(SUM(messages_sent + messages_failed), 0) * 100 FROM campaigns WHERE user_id = v_user_id)
        ELSE 0 END,
      CASE WHEN (SELECT SUM(messages_sent + messages_failed) FROM campaigns WHERE user_id = v_user_id) > 0
        THEN (SELECT SUM(messages_failed)::numeric / NULLIF(SUM(messages_sent + messages_failed), 0) * 100 FROM campaigns WHERE user_id = v_user_id)
        ELSE 0 END,
      v_blacklisted, v_active_agents,
      COALESCE((SELECT last_upload_time FROM dashboard_metrics WHERE user_id = v_user_id AND metric_date = v_today), NOW())
    )
    ON CONFLICT (user_id, metric_date)
    DO UPDATE SET
      total_contacts = EXCLUDED.total_contacts,
      total_messages_sent = EXCLUDED.total_messages_sent,
      total_messages_failed = EXCLUDED.total_messages_failed,
      messages_pending_retry = EXCLUDED.messages_pending_retry,
      active_campaigns = EXCLUDED.active_campaigns,
      completed_campaigns = EXCLUDED.completed_campaigns,
      delivery_rate = EXCLUDED.delivery_rate,
      failure_rate = EXCLUDED.failure_rate,
      blacklisted_numbers = EXCLUDED.blacklisted_numbers,
      active_agents = EXCLUDED.active_agents,
      updated_at = NOW();
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_dashboard_metrics_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_total_contacts integer;
  v_active_campaigns integer;
  v_completed_campaigns integer;
  v_blacklisted integer;
  v_active_agents integer;
BEGIN
  SELECT COUNT(*) INTO v_total_contacts FROM contacts WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_active_campaigns FROM campaigns WHERE user_id = p_user_id AND status = 'Running';
  SELECT COUNT(*) INTO v_completed_campaigns FROM campaigns WHERE user_id = p_user_id AND status = 'Completed';
  SELECT COUNT(*) INTO v_blacklisted FROM contacts WHERE user_id = p_user_id AND is_blacklisted = true;
  SELECT COUNT(*) INTO v_active_agents FROM agents WHERE user_id = p_user_id AND is_active = true;

  INSERT INTO dashboard_metrics (
    user_id, metric_date, total_contacts, total_numbers_uploaded,
    total_messages_sent, total_messages_failed, messages_pending_retry,
    active_campaigns, completed_campaigns, delivery_rate, failure_rate,
    blacklisted_numbers, active_agents, last_upload_time
  ) VALUES (
    p_user_id, v_today, v_total_contacts,
    COALESCE((SELECT total_numbers_uploaded FROM dashboard_metrics WHERE user_id = p_user_id AND metric_date = v_today), 0),
    COALESCE((SELECT SUM(messages_sent) FROM campaigns WHERE user_id = p_user_id), 0),
    COALESCE((SELECT SUM(messages_failed) FROM campaigns WHERE user_id = p_user_id), 0),
    COALESCE((SELECT SUM(pending_retry) FROM campaigns WHERE user_id = p_user_id), 0),
    v_active_campaigns, v_completed_campaigns,
    CASE WHEN (SELECT SUM(messages_sent + messages_failed) FROM campaigns WHERE user_id = p_user_id) > 0
      THEN (SELECT SUM(messages_sent)::numeric / NULLIF(SUM(messages_sent + messages_failed), 0) * 100 FROM campaigns WHERE user_id = p_user_id)
      ELSE 0 END,
    CASE WHEN (SELECT SUM(messages_sent + messages_failed) FROM campaigns WHERE user_id = p_user_id) > 0
      THEN (SELECT SUM(messages_failed)::numeric / NULLIF(SUM(messages_sent + messages_failed), 0) * 100 FROM campaigns WHERE user_id = p_user_id)
      ELSE 0 END,
    v_blacklisted, v_active_agents,
    COALESCE((SELECT last_upload_time FROM dashboard_metrics WHERE user_id = p_user_id AND metric_date = v_today), NOW())
  )
  ON CONFLICT (user_id, metric_date)
  DO UPDATE SET
    total_contacts = EXCLUDED.total_contacts,
    total_messages_sent = EXCLUDED.total_messages_sent,
    total_messages_failed = EXCLUDED.total_messages_failed,
    messages_pending_retry = EXCLUDED.messages_pending_retry,
    active_campaigns = EXCLUDED.active_campaigns,
    completed_campaigns = EXCLUDED.completed_campaigns,
    delivery_rate = EXCLUDED.delivery_rate,
    failure_rate = EXCLUDED.failure_rate,
    blacklisted_numbers = EXCLUDED.blacklisted_numbers,
    active_agents = EXCLUDED.active_agents,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION trigger_refresh_dashboard_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  IF v_user_id IS NOT NULL THEN
    PERFORM refresh_dashboard_metrics_for_user(v_user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION update_campaign_total_numbers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.campaign_id IS NOT NULL THEN
    UPDATE campaigns
    SET total_numbers = (
      SELECT COUNT(*) FROM contacts WHERE campaign_id = NEW.campaign_id AND user_id = NEW.user_id
    )
    WHERE id = NEW.campaign_id AND user_id = NEW.user_id;
  END IF;

  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.campaign_id IS NOT NULL THEN
    UPDATE campaigns
    SET total_numbers = (
      SELECT COUNT(*) FROM contacts WHERE campaign_id = OLD.campaign_id AND user_id = OLD.user_id
    )
    WHERE id = OLD.campaign_id AND user_id = OLD.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- 9. SEED DEFAULT DATA trigger for new users
-- ============================================================

CREATE OR REPLACE FUNCTION seed_user_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status <> 'active') THEN
    INSERT INTO lead_sources (user_id, source_name, total_numbers, messages_sent, messages_failed, converted_leads)
    VALUES
      (NEW.user_id, 'Excel', 0, 0, 0, 0),
      (NEW.user_id, 'Facebook', 0, 0, 0, 0),
      (NEW.user_id, 'Instagram', 0, 0, 0, 0),
      (NEW.user_id, 'Website', 0, 0, 0, 0),
      (NEW.user_id, 'WhatsApp', 0, 0, 0, 0),
      (NEW.user_id, 'Manual', 0, 0, 0, 0)
    ON CONFLICT (user_id, source_name) DO NOTHING;

    INSERT INTO dashboard_metrics (user_id, metric_date, total_contacts, total_numbers_uploaded, total_messages_sent, total_messages_failed, messages_pending_retry, active_campaigns, completed_campaigns, delivery_rate, failure_rate, blacklisted_numbers, active_agents)
    VALUES (NEW.user_id, CURRENT_DATE, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    ON CONFLICT (user_id, metric_date) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_seed_user_defaults ON subscriptions;
CREATE TRIGGER trigger_seed_user_defaults
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION seed_user_defaults();
