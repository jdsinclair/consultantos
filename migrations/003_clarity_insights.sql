-- Migration: Add Clarity Insights and AI filename support
-- Run this in your Neon SQL editor AFTER 002_add_ai_features.sql

-- 1. Add original filename to sources
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS original_name TEXT;

-- 2. Add field metadata to clarity documents
ALTER TABLE clarity_documents
ADD COLUMN IF NOT EXISTS field_meta JSONB;

-- 3. Create clarity_insights table for AI suggestions
CREATE TABLE IF NOT EXISTS clarity_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  field_name TEXT NOT NULL,
  custom_field_title TEXT,
  suggested_value TEXT NOT NULL,
  action TEXT DEFAULT 'update',
  reasoning TEXT,
  confidence REAL,
  source_type TEXT NOT NULL,
  source_id UUID,
  source_context TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Add indexes
CREATE INDEX IF NOT EXISTS clarity_insights_client_idx ON clarity_insights(client_id);
CREATE INDEX IF NOT EXISTS clarity_insights_status_idx ON clarity_insights(status);

-- 5. Add comments
COMMENT ON TABLE clarity_insights IS 'AI-suggested updates to clarity documents, pending user review';
COMMENT ON COLUMN sources.original_name IS 'Original filename as uploaded by user';
COMMENT ON COLUMN clarity_documents.field_meta IS 'Status and history metadata for each field (draft/confirmed/locked)';
