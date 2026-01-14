-- Migration: Add AI features and enhanced notes/tasks
-- Run this in your Neon SQL editor

-- 1. Add AI summary to sources (for Vision AI and document summaries)
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS ai_summary JSONB;

-- 2. Add note classification fields
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'general';

ALTER TABLE notes
ADD COLUMN IF NOT EXISTS labels JSONB;

ALTER TABLE notes
ADD COLUMN IF NOT EXISTS added_to_sources BOOLEAN DEFAULT FALSE;

-- 3. Add subtask and notes support to action_items
ALTER TABLE action_items
ADD COLUMN IF NOT EXISTS parent_id UUID;

ALTER TABLE action_items
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Add index for subtask queries
CREATE INDEX IF NOT EXISTS action_items_parent_idx ON action_items(parent_id);

-- 5. Add comment for reference
COMMENT ON COLUMN sources.ai_summary IS 'AI-generated summary with whatItIs, whyItMatters, keyInsights, suggestedUses';
COMMENT ON COLUMN notes.note_type IS 'general, future, competitor, partner, idea, reference';
COMMENT ON COLUMN notes.labels IS 'Array of custom string labels/tags';
COMMENT ON COLUMN action_items.parent_id IS 'References another action_item for subtask hierarchy';
