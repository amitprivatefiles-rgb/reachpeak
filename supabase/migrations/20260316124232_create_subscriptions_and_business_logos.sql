/*
  # Create subscriptions table and business-logos storage

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `plan_type` (text, monthly or yearly)
      - `amount` (integer, 2499 or 14999)
      - `payment_reference` (text, UTR/transaction ID)
      - `status` (text: pending/active/expired/rejected)
      - `rejection_reason` (text, nullable)
      - `business_name` (text)
      - `business_type` (text)
      - `whatsapp_number` (text)
      - `website_url` (text, nullable)
      - `logo_url` (text, nullable)
      - `business_address` (text, nullable)
      - `contact_person` (text)
      - `approved_by` (uuid, nullable, references auth.users)
      - `approved_at` (timestamptz, nullable)
      - `starts_at` (timestamptz, nullable)
      - `expires_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `subscriptions` table
    - Users can view their own subscriptions
    - Admins can view all subscriptions
    - Authenticated users can insert their own subscription
    - Admins can update all subscriptions
    - Admins can delete all subscriptions

  3. Storage
    - Create `business-logos` bucket for logo uploads

  4. Triggers
    - Auto-update `updated_at` on subscriptions
*/

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

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Authenticated users can insert own subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete all subscriptions"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'business-logos');

CREATE POLICY "Anyone can view logos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'business-logos');

CREATE POLICY "Admins can delete logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'business-logos' AND (SELECT is_admin()));
