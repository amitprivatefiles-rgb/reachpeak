-- ============================================================
-- Template header sample URL + storage bucket
-- ============================================================

-- 1. Add header_sample_url to templates (durable re-hosted URL for approved sample media)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS header_sample_url text;

-- 2. Public bucket for re-hosted approved sample header media
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-samples', 'template-samples', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Allow public read (already public bucket, but explicit policy)
CREATE POLICY "public read template samples"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-samples');

-- 4. Allow authenticated uploads
CREATE POLICY "authenticated upload template samples"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'template-samples');

-- 5. Allow service_role to manage (for edge function re-hosting)
CREATE POLICY "service manage template samples"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'template-samples');
