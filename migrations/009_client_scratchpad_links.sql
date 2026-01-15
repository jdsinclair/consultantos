-- Add "At Some Point" scratchpad and "Links" reference storage to clients
-- These are lightweight JSONB columns for unstructured client data

-- "At Some Point" - a dumping ground for ideas, future thoughts
-- Structure: [{id, title, text, createdAt}]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS at_some_point JSONB DEFAULT '[]'::jsonb;

-- "Links" - reference links to competitors, people, resources
-- Structure: [{id, title, url, type, notes, createdAt}]
ALTER TABLE clients ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;

-- Add a comment for documentation
COMMENT ON COLUMN clients.at_some_point IS 'Scratchpad for future ideas: [{id, title, text, createdAt}]';
COMMENT ON COLUMN clients.links IS 'Reference links: [{id, title, url, type, notes, createdAt}]';
