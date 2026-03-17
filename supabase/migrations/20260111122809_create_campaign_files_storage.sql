/*
  # Create Storage Bucket for Campaign Files

  1. Storage Setup
    - Create `campaign-files` bucket for storing uploaded files
    - Set up RLS policies for secure access
    
  2. Security
    - Admins can upload files
    - All authenticated users can view files
*/

-- Create storage bucket for campaign files
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-files', 'campaign-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Admins can upload files
CREATE POLICY "Admins can upload campaign files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-files' AND
    (SELECT is_admin())
  );

-- Policy: Authenticated users can view files
CREATE POLICY "Authenticated users can view campaign files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'campaign-files');

-- Policy: Admins can update files
CREATE POLICY "Admins can update campaign files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'campaign-files' AND
    (SELECT is_admin())
  )
  WITH CHECK (
    bucket_id = 'campaign-files' AND
    (SELECT is_admin())
  );

-- Policy: Admins can delete files
CREATE POLICY "Admins can delete campaign files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'campaign-files' AND
    (SELECT is_admin())
  );