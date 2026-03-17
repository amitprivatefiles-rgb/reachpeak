/*
  # Allow Duplicate Phone Numbers in Contacts

  ## Changes Made
  1. Remove unique constraint from phone_number column in contacts table
     - This allows the same phone number to be uploaded multiple times
     - Useful when the same contact is part of multiple campaigns or sources
  
  2. Keep the non-unique index for performance
     - Fast lookups by phone number are still available
     - No performance degradation for queries
  
  ## Important Notes
  - This change allows duplicate phone numbers across different campaigns
  - The duplicate checking logic in the frontend is now bypassed
  - Each upload will create new contact records even if the phone number exists
*/

-- Drop the unique constraint on phone_number
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_number_key;

-- The non-unique index idx_contacts_phone already exists from the previous migration
-- This keeps phone number lookups fast without enforcing uniqueness