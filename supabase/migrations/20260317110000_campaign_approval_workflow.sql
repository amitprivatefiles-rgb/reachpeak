/*
  # Campaign Approval Workflow

  1. Schema Changes
    - Add approval columns to campaigns table
    - Update status constraint to include new values
    - Create campaign_contacts junction table
    - Create notifications table

  2. Security Changes
    - Add admin override RLS policies so admins can access all users' campaigns
    - Add RLS policies for new tables

  3. Notes
    - Admin is identified by checking profiles.role = 'admin'
    - All existing data is unaffected (new columns are nullable)
*/

-- ============================================================
-- 1. ADD APPROVAL COLUMNS TO CAMPAIGNS
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='submitted_at') THEN
    ALTER TABLE campaigns ADD COLUMN submitted_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='approved_at') THEN
    ALTER TABLE campaigns ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='approved_by') THEN
    ALTER TABLE campaigns ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='rejected_at') THEN
    ALTER TABLE campaigns ADD COLUMN rejected_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='rejection_reason') THEN
    ALTER TABLE campaigns ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='scheduled_start') THEN
    ALTER TABLE campaigns ADD COLUMN scheduled_start TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='selected_audience') THEN
    ALTER TABLE campaigns ADD COLUMN selected_audience JSONB;
  END IF;
END $$;

-- ============================================================
-- 2. UPDATE STATUS CONSTRAINT
-- ============================================================

-- Drop old constraint if it exists (may have different names from different migrations)
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Add updated constraint including new approval statuses
DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
    CHECK (status IN ('pending_approval', 'approved', 'Running', 'Paused', 'Completed', 'Processing', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. CREATE campaign_contacts JUNCTION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_id)
);

ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;

-- RLS for campaign_contacts
CREATE POLICY "Users can view own campaign_contacts"
  ON campaign_contacts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign_contacts"
  ON campaign_contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaign_contacts"
  ON campaign_contacts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admin override for campaign_contacts
CREATE POLICY "Admins can view all campaign_contacts"
  ON campaign_contacts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

-- ============================================================
-- 4. CREATE notifications TABLE
-- ============================================================

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

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can insert notifications for any user (via service_role in edge functions)
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_contact ON campaign_contacts(contact_id);

-- ============================================================
-- 5. ADMIN OVERRIDE RLS POLICIES FOR CAMPAIGNS
-- ============================================================

-- Allow admins to SELECT all campaigns (not just their own)
CREATE POLICY "Admins can view all campaigns"
  ON campaigns FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

-- Allow admins to UPDATE all campaigns (for approval, auto-increment config)
CREATE POLICY "Admins can update all campaigns"
  ON campaigns FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

-- Allow admins to view all contacts (for campaign review)
CREATE POLICY "Admins can view all contacts"
  ON contacts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

-- Allow admins to view all dashboard_metrics
CREATE POLICY "Admins can view all dashboard_metrics"
  ON dashboard_metrics FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );
