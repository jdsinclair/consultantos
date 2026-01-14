-- Migration: Deal Mode Privacy Toggle & Historic Sessions
-- Run this in Neon SQL Editor

-- =====================================================
-- 1. Add deal/financial fields to clients table
-- =====================================================
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS deal_value INTEGER,
ADD COLUMN IF NOT EXISTS deal_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS deal_notes TEXT;

COMMENT ON COLUMN clients.deal_value IS 'Deal value in cents (e.g., 500000 = $5,000)';
COMMENT ON COLUMN clients.deal_status IS 'none, placeholder, presented, active';
COMMENT ON COLUMN clients.deal_notes IS 'Private notes about the deal';

-- =====================================================
-- 2. Add historic session fields to sessions table
-- =====================================================
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS is_historic BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB,
ADD COLUMN IF NOT EXISTS session_date TIMESTAMP;

COMMENT ON COLUMN sessions.is_historic IS 'True for manually added past sessions';
COMMENT ON COLUMN sessions.notes IS 'Manual notes from the session';
COMMENT ON COLUMN sessions.attachments IS 'Array of SessionAttachment objects (whiteboard images, docs, etc.)';
COMMENT ON COLUMN sessions.session_date IS 'For historic sessions - when it actually happened';

-- =====================================================
-- Verify the changes
-- =====================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN ('deal_value', 'deal_status', 'deal_notes');

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name IN ('is_historic', 'notes', 'attachments', 'session_date');
