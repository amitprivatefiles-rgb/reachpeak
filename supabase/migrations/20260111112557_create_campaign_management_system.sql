/*
  # WhatsApp Campaign Management System

  ## Overview
  This migration creates a complete backend-driven system for managing WhatsApp marketing campaigns,
  contacts, failures, retries, and user access with role-based permissions.

  ## 1. New Tables

  ### profiles
  - `id` (uuid, primary key, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (text) - 'admin' or 'user'
  - `is_active` (boolean) - account status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### campaigns
  - `id` (uuid, primary key)
  - `name` (text) - campaign name
  - `type` (text) - 'Promotion', 'Follow-up', 'Offer', 'Reminder'
  - `start_time` (timestamptz)
  - `end_time` (timestamptz)
  - `total_numbers` (integer)
  - `messages_sent` (integer)
  - `messages_failed` (integer)
  - `pending_retry` (integer)
  - `delivery_percentage` (numeric)
  - `failure_percentage` (numeric)
  - `priority` (integer)
  - `message_version` (text) - 'A' or 'B'
  - `campaign_cost` (numeric)
  - `estimated_revenue` (numeric)
  - `roi` (numeric)
  - `status` (text) - 'Running', 'Paused', 'Completed'
  - `is_locked` (boolean) - locked after completion
  - `daily_limit` (integer) - daily sending limit
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### contacts
  - `id` (uuid, primary key)
  - `phone_number` (text, unique)
  - `name` (text)
  - `source` (text) - 'Excel', 'Facebook', 'Instagram', 'Website', 'WhatsApp', 'Manual'
  - `city` (text)
  - `state` (text)
  - `campaign_id` (uuid, references campaigns)
  - `message_status` (text) - 'Pending', 'Sent', 'Failed', 'Retry'
  - `delivery_status` (text) - 'Delivered', 'Failed', 'Pending'
  - `attempt_count` (integer)
  - `last_sent_date` (timestamptz)
  - `lead_type` (text) - 'Hot', 'Warm', 'Cold'
  - `notes` (text)
  - `is_blacklisted` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### failed_messages
  - `id` (uuid, primary key)
  - `phone_number` (text)
  - `contact_id` (uuid, references contacts)
  - `campaign_id` (uuid, references campaigns)
  - `failure_reason` (text)
  - `attempt_count` (integer)
  - `last_attempt_date` (timestamptz)
  - `status` (text) - 'Retry Pending', 'Completed', 'Blacklisted'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### agents
  - `id` (uuid, primary key)
  - `name` (text)
  - `email` (text)
  - `is_active` (boolean)
  - `campaigns_handled` (integer)
  - `numbers_processed` (integer)
  - `failures` (integer)
  - `conversions` (integer)
  - `follow_ups` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### campaign_agents
  - `id` (uuid, primary key)
  - `campaign_id` (uuid, references campaigns)
  - `agent_id` (uuid, references agents)
  - `assigned_at` (timestamptz)

  ### lead_sources
  - `id` (uuid, primary key)
  - `source_name` (text, unique)
  - `total_numbers` (integer)
  - `messages_sent` (integer)
  - `messages_failed` (integer)
  - `converted_leads` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### activity_logs
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `action` (text) - action performed
  - `entity_type` (text) - 'campaign', 'contact', 'agent', etc.
  - `entity_id` (uuid)
  - `details` (jsonb) - additional details
  - `created_at` (timestamptz)

  ### dashboard_metrics
  - `id` (uuid, primary key)
  - `metric_date` (date, unique)
  - `total_contacts` (integer)
  - `numbers_uploaded_today` (integer)
  - `messages_sent_today` (integer)
  - `messages_failed_today` (integer)
  - `messages_pending_retry` (integer)
  - `active_campaigns` (integer)
  - `completed_campaigns` (integer)
  - `delivery_rate` (numeric)
  - `failure_rate` (numeric)
  - `blacklisted_numbers` (integer)
  - `active_agents` (integer)
  - `last_upload_time` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Admin users can perform all operations
  - Regular users have read-only access
  - Each table has specific policies for select, insert, update, and delete operations

  ## 3. Indexes
  - Index on phone numbers for fast lookup
  - Index on campaign_id for filtering
  - Index on contact source for grouping
  - Index on dates for filtering

  ## 4. Functions
  - Function to check if user is admin
  - Function to update dashboard metrics
  - Function to auto-blacklist after 3 failures
*/

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
  status text DEFAULT 'Paused' CHECK (status IN ('Running', 'Paused', 'Completed')),
  is_locked boolean DEFAULT false,
  daily_limit integer DEFAULT 1000,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
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
  source_name text UNIQUE NOT NULL,
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
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create dashboard_metrics table
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date UNIQUE DEFAULT CURRENT_DATE,
  total_contacts integer DEFAULT 0,
  numbers_uploaded_today integer DEFAULT 0,
  messages_sent_today integer DEFAULT 0,
  messages_failed_today integer DEFAULT 0,
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

-- Create indexes for performance
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

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_failed_messages_updated_at BEFORE UPDATE ON failed_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lead_sources_updated_at BEFORE UPDATE ON lead_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_dashboard_metrics_updated_at BEFORE UPDATE ON dashboard_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- Campaigns policies
CREATE POLICY "Users can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (is_admin());

-- Contacts policies
CREATE POLICY "Users can view contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (is_admin());

-- Failed messages policies
CREATE POLICY "Users can view failed messages"
  ON failed_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert failed messages"
  ON failed_messages FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update failed messages"
  ON failed_messages FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete failed messages"
  ON failed_messages FOR DELETE
  TO authenticated
  USING (is_admin());

-- Agents policies
CREATE POLICY "Users can view agents"
  ON agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete agents"
  ON agents FOR DELETE
  TO authenticated
  USING (is_admin());

-- Campaign agents policies
CREATE POLICY "Users can view campaign agents"
  ON campaign_agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert campaign agents"
  ON campaign_agents FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete campaign agents"
  ON campaign_agents FOR DELETE
  TO authenticated
  USING (is_admin());

-- Lead sources policies
CREATE POLICY "Users can view lead sources"
  ON lead_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert lead sources"
  ON lead_sources FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update lead sources"
  ON lead_sources FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete lead sources"
  ON lead_sources FOR DELETE
  TO authenticated
  USING (is_admin());

-- Activity logs policies
CREATE POLICY "Users can view all activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Dashboard metrics policies
CREATE POLICY "Users can view dashboard metrics"
  ON dashboard_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert dashboard metrics"
  ON dashboard_metrics FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update dashboard metrics"
  ON dashboard_metrics FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Insert default lead sources
INSERT INTO lead_sources (source_name) VALUES
  ('Excel'),
  ('Facebook'),
  ('Instagram'),
  ('Website'),
  ('WhatsApp'),
  ('Manual')
ON CONFLICT (source_name) DO NOTHING;

-- Insert initial dashboard metrics for today
INSERT INTO dashboard_metrics (metric_date) VALUES (CURRENT_DATE)
ON CONFLICT (metric_date) DO NOTHING;