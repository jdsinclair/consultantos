-- Add new columns to action_items table for enhanced TODO system
ALTER TABLE "action_items" ADD COLUMN IF NOT EXISTS "note_id" uuid REFERENCES "notes"("id") ON DELETE SET NULL;
ALTER TABLE "action_items" ADD COLUMN IF NOT EXISTS "email_id" uuid REFERENCES "inbound_emails"("id") ON DELETE SET NULL;
ALTER TABLE "action_items" ADD COLUMN IF NOT EXISTS "source_context" text;

-- Update source column to support new sources (manual, detected, note, transcript, email)
-- No change needed since it's a text column

-- Make clientId nullable (for quick-add without client)
ALTER TABLE "action_items" ALTER COLUMN "client_id" DROP NOT NULL;

-- Add indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS "action_items_note_idx" ON "action_items" ("note_id");
CREATE INDEX IF NOT EXISTS "action_items_email_idx" ON "action_items" ("email_id");
