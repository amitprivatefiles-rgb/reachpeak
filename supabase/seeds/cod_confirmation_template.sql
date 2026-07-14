-- COD Confirmation Template Submission
-- Run this after deployment to submit the template to Meta for approval.
-- Requires: WABA account connected with access_token in vault.
--
-- Template Name: cod_confirmation
-- Category: UTILITY (transactional — not marketing-gated)
-- Language: en
-- Body: 4 variables (customer_name, order_number, total, store_name)
-- Buttons: 2 quick-reply (✅ Confirm, ❌ Cancel)
--
-- Meta approval typically takes 10-60 minutes for utility templates.

-- 1. Insert template record (pending approval)
INSERT INTO templates (
  whatsapp_account_id,
  name,
  language,
  category,
  status,
  body_text,
  components,
  created_at,
  updated_at
)
SELECT
  wa.id,
  'cod_confirmation',
  'en',
  'utility',
  'pending',
  'Hi {{1}}, please confirm your Cash-on-Delivery order {{2}} for ₹{{3}} from {{4}}. Tap below to confirm or cancel.',
  '[
    {
      "type": "BODY",
      "text": "Hi {{1}}, please confirm your Cash-on-Delivery order {{2}} for ₹{{3}} from {{4}}. Tap below to confirm or cancel.",
      "example": {
        "body_text": [["Amit", "ORD-12345", "4,200", "MyStore"]]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {"type": "QUICK_REPLY", "text": "✅ Confirm"},
        {"type": "QUICK_REPLY", "text": "❌ Cancel"}
      ]
    }
  ]'::jsonb,
  now(),
  now()
FROM whatsapp_accounts wa
WHERE wa.is_active = true
ON CONFLICT DO NOTHING;

-- 2. The actual Meta submission happens via manage-template endpoint.
-- Use this curl command after the template is inserted:
--
-- curl -X POST https://<project>.supabase.co/functions/v1/manage-template \
--   -H "Authorization: Bearer <jwt_token>" \
--   -H "Content-Type: application/json" \
--   -d '{
--     "action": "create",
--     "name": "cod_confirmation",
--     "language": "en",
--     "category": "UTILITY",
--     "components": [
--       {
--         "type": "BODY",
--         "text": "Hi {{1}}, please confirm your Cash-on-Delivery order {{2}} for ₹{{3}} from {{4}}. Tap below to confirm or cancel.",
--         "example": {
--           "body_text": [["Amit", "ORD-12345", "4,200", "MyStore"]]
--         }
--       },
--       {
--         "type": "BUTTONS",
--         "buttons": [
--           {"type": "QUICK_REPLY", "text": "✅ Confirm"},
--           {"type": "QUICK_REPLY", "text": "❌ Cancel"}
--         ]
--       }
--     ]
--   }'
--
-- Check status: curl with action: "sync" to pull approval status from Meta.
