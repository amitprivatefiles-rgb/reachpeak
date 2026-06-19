-- ============================================================
-- Phase 3: Template Management
-- ============================================================

-- 1. Add 'components' jsonb column for the raw Meta components array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'components'
  ) THEN
    ALTER TABLE templates ADD COLUMN components jsonb;
  END IF;
END $$;

-- 2. Add template_id FK on campaigns (references a specific template)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN template_id uuid REFERENCES templates(id);
  END IF;
END $$;

-- 3. Add variable_mapping jsonb on campaigns
--    Stores the {{N}} → contact-field map, e.g. {"1": "name", "2": "city"}
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'variable_mapping'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN variable_mapping jsonb;
  END IF;
END $$;

-- 4. Index for fast lookup of approved templates per user
CREATE INDEX IF NOT EXISTS idx_templates_user_status
  ON templates (user_id, status);

-- 5. Index for webhook lookup by meta_template_id
CREATE INDEX IF NOT EXISTS idx_templates_meta_id
  ON templates (meta_template_id);
