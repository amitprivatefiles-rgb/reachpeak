-- ============================================================
-- COMPLETE DATABASE SETUP - Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: CORE TABLES + FUNCTIONS + RLS
-- ============================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Promotion', 'Follow-up', 'Offer', 'Reminder')),
  start_time timestamptz,
  end_time timestamptz,
  total_numbers integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  messages_failed integer DEFAULT 0,
  pending_retry integer DEFAULT 0,
  delivery_percentage numeric(5,2) DEFAULT 0,
  failure_percentage numeric(5,2) DEFAULT 0,
  priority integer DEFAULT 1,
  message_version text DEFAULT 'A' CHECK (message_version IN ('A', 'B')),
  campaign_cost numeric(10,2) DEFAULT 0,
  estimated_revenue numeric(10,2) DEFAULT 0,
  roi numeric(10,2) DEFAULT 0,
  status text DEFAULT 'Paused',
  is_locked boolean DEFAULT false,
  daily_limit integer DEFAULT 1000,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  name text,
  source text NOT NULL CHECK (source IN ('Excel', 'Facebook', 'Instagram', 'Website', 'WhatsApp', 'Manual')),
  city text,
  state text,
  campaign_id uuid REFERENCES campaigns(id),
  message_status text DEFAULT 'Pending' CHECK (message_status IN ('Pending', 'Sent', 'Failed', 'Retry')),
  delivery_status text DEFAULT 'Pending' CHECK (delivery_status IN ('Delivered', 'Failed', 'Pending')),
  attempt_count integer DEFAULT 0,
  last_sent_date timestamptz,
  lead_type text DEFAULT 'Warm' CHECK (lead_type IN ('Hot', 'Warm', 'Cold')),
  notes text,
  is_blacklisted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create failed_messages table
CREATE TABLE IF NOT EXISTS failed_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id),
  failure_reason text,
  attempt_count integer DEFAULT 1,
  last_attempt_date timestamptz DEFAULT now(),
  status text DEFAULT 'Retry Pending' CHECK (status IN ('Retry Pending', 'Completed', 'Blacklisted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  campaigns_handled integer DEFAULT 0,
  numbers_processed integer DEFAULT 0,
  failures integer DEFAULT 0,
  conversions integer DEFAULT 0,
  follow_ups integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaign_agents junction table
CREATE TABLE IF NOT EXISTS campaign_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, agent_id)
);

-- Create lead_sources table
CREATE TABLE IF NOT EXISTS lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  total_numbers integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  messages_failed integer DEFAULT 0,
  converted_leads integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create dashboard_metrics table
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date DEFAULT CURRENT_DATE,
  total_contacts integer DEFAULT 0,
  total_numbers_uploaded integer DEFAULT 0,
  total_messages_sent integer DEFAULT 0,
  total_messages_failed integer DEFAULT 0,
  messages_pending_retry integer DEFAULT 0,
  active_campaigns integer DEFAULT 0,
  completed_campaigns integer DEFAULT 0,
  delivery_rate numeric(5,2) DEFAULT 0,
  failure_rate numeric(5,2) DEFAULT 0,
  blacklisted_numbers integer DEFAULT 0,
  active_agents integer DEFAULT 0,
  last_upload_time timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type text CHECK (plan_type IN ('monthly', 'yearly')) NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  payment_reference text NOT NULL DEFAULT '',
  status text CHECK (status IN ('pending', 'active', 'expired', 'rejected')) DEFAULT 'pending',
  rejection_reason text,
  business_name text NOT NULL DEFAULT '',
  business_type text NOT NULL DEFAULT '',
  whatsapp_number text NOT NULL DEFAULT '',
  website_url text,
  logo_url text,
  business_address text,
  contact_person text NOT NULL DEFAULT '',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 2: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_campaign ON contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_blacklist ON contacts(is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_failed_messages_contact ON failed_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_failed_messages_campaign ON failed_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================================
-- PART 3: FUNCTIONS
-- ============================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'user',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 4: TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_failed_messages_updated_at ON failed_messages;
CREATE TRIGGER update_failed_messages_updated_at BEFORE UPDATE ON failed_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_lead_sources_updated_at ON lead_sources;
CREATE TRIGGER update_lead_sources_updated_at BEFORE UPDATE ON lead_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_dashboard_metrics_updated_at ON dashboard_metrics;
CREATE TRIGGER update_dashboard_metrics_updated_at BEFORE UPDATE ON dashboard_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Profile auto-creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PART 5: ADD EXTRA COLUMNS TO CAMPAIGNS
-- ============================================================

DO $$
BEGIN
  -- File and message template columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'file_url') THEN
    ALTER TABLE campaigns ADD COLUMN file_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'file_name') THEN
    ALTER TABLE campaigns ADD COLUMN file_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'message_template') THEN
    ALTER TABLE campaigns ADD COLUMN message_template text;
  END IF;

  -- Auto-increment columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'auto_increment_enabled') THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'auto_increment_total') THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_total integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'auto_increment_sent_ratio') THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_sent_ratio numeric(5,2) DEFAULT 70.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'auto_increment_failed_ratio') THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_failed_ratio numeric(5,2) DEFAULT 30.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'auto_increment_interval') THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_interval integer DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'last_auto_increment') THEN
    ALTER TABLE campaigns ADD COLUMN last_auto_increment timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'auto_increment_complete_at') THEN
    ALTER TABLE campaigns ADD COLUMN auto_increment_complete_at timestamptz;
  END IF;

  -- Approval workflow columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='submitted_at') THEN
    ALTER TABLE campaigns ADD COLUMN submitted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='approved_at') THEN
    ALTER TABLE campaigns ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='approved_by') THEN
    ALTER TABLE campaigns ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='rejected_at') THEN
    ALTER TABLE campaigns ADD COLUMN rejected_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='rejection_reason') THEN
    ALTER TABLE campaigns ADD COLUMN rejection_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='scheduled_start') THEN
    ALTER TABLE campaigns ADD COLUMN scheduled_start TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='selected_audience') THEN
    ALTER TABLE campaigns ADD COLUMN selected_audience JSONB;
  END IF;
END $$;

-- Update status constraint to include all values
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'Running', 'Paused', 'Completed', 'Processing', 'rejected'));

-- ============================================================
-- PART 6: ADD user_id FOR MULTI-TENANCY
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

-- Add unique constraints for multi-tenancy
DO $$ BEGIN
  ALTER TABLE lead_sources DROP CONSTRAINT IF EXISTS lead_sources_source_name_key;
  ALTER TABLE lead_sources ADD CONSTRAINT lead_sources_user_source_unique UNIQUE (user_id, source_name);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE dashboard_metrics DROP CONSTRAINT IF EXISTS dashboard_metrics_metric_date_key;
  ALTER TABLE dashboard_metrics ADD CONSTRAINT dashboard_metrics_user_date_unique UNIQUE (user_id, metric_date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for user_id
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_messages_user_id ON failed_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_agents_user_id ON campaign_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_user_id ON lead_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_user_id ON dashboard_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- ============================================================
-- PART 7: CREATE APPROVAL WORKFLOW TABLES
-- ============================================================

-- campaign_contacts junction table
CREATE TABLE IF NOT EXISTS campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_id)
);

ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('campaign_approved', 'campaign_rejected', 'campaign_completed', 'system')) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_contact ON campaign_contacts(contact_id);

-- ============================================================
-- PART 8: ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 9: RLS POLICIES
-- ============================================================

-- Profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE TO authenticated USING (is_admin());

-- Campaigns (per-user + admin override)
CREATE POLICY "Users can view own campaigns" ON campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all campaigns" ON campaigns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true));
CREATE POLICY "Admins can update all campaigns" ON campaigns FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true));

-- Contacts (per-user + admin override)
CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all contacts" ON contacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true));

-- Failed messages
CREATE POLICY "Users can view own failed messages" ON failed_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own failed messages" ON failed_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own failed messages" ON failed_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own failed messages" ON failed_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Agents
CREATE POLICY "Users can view own agents" ON agents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agents" ON agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agents" ON agents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own agents" ON agents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Campaign agents
CREATE POLICY "Users can view own campaign agents" ON campaign_agents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaign agents" ON campaign_agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaign agents" ON campaign_agents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaign agents" ON campaign_agents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lead sources
CREATE POLICY "Users can view own lead sources" ON lead_sources FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lead sources" ON lead_sources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lead sources" ON lead_sources FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own lead sources" ON lead_sources FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Dashboard metrics (per-user + admin override)
CREATE POLICY "Users can view own dashboard metrics" ON dashboard_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dashboard metrics" ON dashboard_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dashboard metrics" ON dashboard_metrics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all dashboard_metrics" ON dashboard_metrics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true));

-- Activity logs
CREATE POLICY "Users can view own activity logs" ON activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON subscriptions FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Authenticated users can insert own subscription" ON subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update all subscriptions" ON subscriptions FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete all subscriptions" ON subscriptions FOR DELETE TO authenticated USING (is_admin());

-- campaign_contacts
CREATE POLICY "Users can view own campaign_contacts" ON campaign_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaign_contacts" ON campaign_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaign_contacts" ON campaign_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all campaign_contacts" ON campaign_contacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true));

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Storage policies for business-logos bucket
CREATE POLICY "Authenticated users can upload logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-logos');
CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'business-logos');
CREATE POLICY "Admins can delete logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'business-logos' AND (SELECT is_admin()));

-- Storage policies for campaign-files bucket
CREATE POLICY "Admins can upload campaign files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'campaign-files' AND (SELECT is_admin()));
CREATE POLICY "Authenticated users can view campaign files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'campaign-files');
CREATE POLICY "Admins can update campaign files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'campaign-files' AND (SELECT is_admin())) WITH CHECK (bucket_id = 'campaign-files' AND (SELECT is_admin()));
CREATE POLICY "Admins can delete campaign files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'campaign-files' AND (SELECT is_admin()));

-- ============================================================
-- PART 10: DASHBOARD METRICS FUNCTIONS & TRIGGERS
-- ============================================================

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

CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN SELECT DISTINCT u.user_id FROM (
    SELECT DISTINCT user_id FROM campaigns WHERE user_id IS NOT NULL
    UNION SELECT DISTINCT user_id FROM contacts WHERE user_id IS NOT NULL
    UNION SELECT DISTINCT user_id FROM agents WHERE user_id IS NOT NULL
  ) u
  LOOP
    PERFORM refresh_dashboard_metrics_for_user(v_user_id);
  END LOOP;
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

-- Dashboard/campaign auto-refresh triggers
DROP TRIGGER IF EXISTS trigger_campaigns_refresh_metrics ON campaigns;
CREATE TRIGGER trigger_campaigns_refresh_metrics
  AFTER INSERT OR UPDATE OR DELETE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_dashboard_metrics();

DROP TRIGGER IF EXISTS trigger_contacts_refresh_metrics ON contacts;
CREATE TRIGGER trigger_contacts_refresh_metrics
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_dashboard_metrics();

DROP TRIGGER IF EXISTS trigger_update_campaign_total_numbers ON contacts;
CREATE TRIGGER trigger_update_campaign_total_numbers
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_campaign_total_numbers();

-- ============================================================
-- PART 11: SEED USER DEFAULTS TRIGGER
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
  FOR EACH ROW EXECUTE FUNCTION seed_user_defaults();

-- ============================================================
-- PART 12: STORAGE BUCKETS (skip if already created via UI)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-files', 'campaign-files', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DONE! All tables, functions, triggers, and policies are set up.
-- ============================================================
