/*
  # Tags, Campaign Buttons, and Settings Enhancements

  1. New Tables
    - `tags` — user-created contact tags
    - `contact_tags` — many-to-many junction between contacts and tags

  2. Schema Changes
    - Add `message_buttons` JSONB column to campaigns
    - Add settings columns to profiles (whatsapp_api_key, etc.)

  3. Security
    - RLS on new tables (user_id based)
*/

-- ============================================================
-- 1. TAGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags" ON tags FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON tags FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON tags FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON tags FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- ============================================================
-- 2. CONTACT_TAGS JUNCTION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, tag_id)
);

ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact_tags" ON contact_tags FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contact_tags" ON contact_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contact_tags" ON contact_tags FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_user ON contact_tags(user_id);

-- ============================================================
-- 3. ADD message_buttons TO CAMPAIGNS
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='message_buttons') THEN
    ALTER TABLE campaigns ADD COLUMN message_buttons JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- ============================================================
-- 4. ADD SETTINGS COLUMNS TO PROFILES
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='whatsapp_api_key') THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_api_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='whatsapp_api_url') THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_api_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='webhook_url') THEN
    ALTER TABLE profiles ADD COLUMN webhook_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='notification_email') THEN
    ALTER TABLE profiles ADD COLUMN notification_email BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='notification_in_app') THEN
    ALTER TABLE profiles ADD COLUMN notification_in_app BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
