-- ============================================================
-- Phase 4: Inbox — conversations table + storage bucket
-- ============================================================

-- 1. Conversations table: tracks inbox state per contact
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_account_id uuid REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  contact_phone text NOT NULL,
  contact_name text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  last_message_direction text DEFAULT 'inbound',
  unread_count integer NOT NULL DEFAULT 0,
  is_open boolean NOT NULL DEFAULT true,
  window_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One conversation per user+phone combo
CREATE UNIQUE INDEX IF NOT EXISTS conversations_user_phone_key
  ON conversations (user_id, contact_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_user_last_msg
  ON conversations (user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unread
  ON conversations (user_id, unread_count) WHERE unread_count > 0;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select own conversations" ON conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner insert own conversations" ON conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update own conversations" ON conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS touch_conversations ON conversations;
CREATE TRIGGER touch_conversations BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 2. Add media_url column to messages for stored media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_url text;
  END IF;
END $$;

-- 3. Add conversation_id FK to messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages (conversation_id, created_at);

-- 4. Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/ogg','audio/aac','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users upload own media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read for chat-media (so WhatsApp can fetch the URL)
CREATE POLICY "Public read chat media" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'chat-media');

-- Service role full access for webhook media downloads
CREATE POLICY "Service role full access chat media" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'chat-media')
  WITH CHECK (bucket_id = 'chat-media');
