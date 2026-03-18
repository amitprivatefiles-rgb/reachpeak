/*
  # Fix Campaign Approval Visibility

  1. Add FK from campaigns.user_id → profiles.id
     so the admin panel can reliably JOIN profile info via user_id (NOT NULL)
     instead of the nullable created_by column.

  2. Re-apply admin override RLS policies (idempotent)
     in case they were never applied to the live database.
*/

-- ============================================================
-- 1. BACKFILL: Create missing profiles for any campaign user_ids
--    that exist in auth.users but not in profiles
-- ============================================================

INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'user',
  true
FROM auth.users au
WHERE au.id IN (SELECT DISTINCT user_id FROM campaigns)
  AND au.id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. ADD FK: campaigns.user_id → profiles.id
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'campaigns_user_id_profiles_fkey'
      AND table_name = 'campaigns'
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;
END $$;

-- ============================================================
-- 2. ENSURE admin override RLS policies exist for campaigns
-- ============================================================

-- SELECT override
DROP POLICY IF EXISTS "Admins can view all campaigns" ON campaigns;
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

-- UPDATE override
DROP POLICY IF EXISTS "Admins can update all campaigns" ON campaigns;
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
