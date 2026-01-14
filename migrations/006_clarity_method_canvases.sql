-- Clarity Method™ Canvas - Strategic Diagnosis + Execution Mapping
-- This table stores the evolving strategic canvas for each client

CREATE TABLE IF NOT EXISTS clarity_method_canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Section 0: Strategic Truth Header (6 boxes)
  strategic_truth JSONB,
  
  -- Section 1: North Star (Constraints, not vision)
  north_star JSONB,
  
  -- Section 2: Core Engine (Reality diagnosis)
  core_engine JSONB,
  
  -- Section 3: Value Expansion Map
  value_expansion JSONB,
  
  -- Section 4: Service vs Product Filter
  service_product_filter JSONB,
  
  -- Section 5: Kill List
  kill_list JSONB,
  
  -- Section 6: Paranoia Map
  paranoia_map JSONB,
  
  -- Section 7: Strategy (1-page synthesis)
  strategy JSONB,
  
  -- Section 8: Execution Swimlanes
  swimlanes JSONB,
  
  -- Canvas state
  phase TEXT DEFAULT 'diagnostic', -- diagnostic, constraint, execution
  locked_sections JSONB, -- array of locked section IDs
  
  -- Version history
  history JSONB,
  
  -- AI conversation for this canvas
  conversation_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS clarity_canvas_client_idx ON clarity_method_canvases(client_id);
CREATE INDEX IF NOT EXISTS clarity_canvas_user_idx ON clarity_method_canvases(user_id);

-- Comment on table
COMMENT ON TABLE clarity_method_canvases IS 'Clarity Method™ - Strategic Diagnosis + Execution Mapping Canvas per client';
