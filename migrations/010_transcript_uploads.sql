-- Transcript Uploads - pasted/uploaded transcripts waiting to be assigned
-- Similar to inbound_emails but for raw transcript content

CREATE TABLE IF NOT EXISTS transcript_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Transcript content
  title TEXT,
  content TEXT NOT NULL,

  -- Optional metadata for when it becomes a session
  session_date TIMESTAMP,
  duration INTEGER, -- in minutes
  notes TEXT,

  -- Source info
  source_type TEXT DEFAULT 'paste', -- paste, upload, import
  original_filename TEXT,

  -- Processing
  status TEXT DEFAULT 'inbox', -- inbox, assigned, archived
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  processed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS transcript_uploads_user_idx ON transcript_uploads(user_id);
CREATE INDEX IF NOT EXISTS transcript_uploads_client_idx ON transcript_uploads(client_id);
CREATE INDEX IF NOT EXISTS transcript_uploads_status_idx ON transcript_uploads(status);

-- Add comments for documentation
COMMENT ON TABLE transcript_uploads IS 'Pasted/uploaded transcripts waiting to be assigned to clients and sessions';
COMMENT ON COLUMN transcript_uploads.status IS 'inbox: pending review, assigned: converted to session, archived: dismissed';
COMMENT ON COLUMN transcript_uploads.source_type IS 'paste: pasted text, upload: uploaded file, import: from external source';
