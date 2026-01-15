-- "Do The Thing" Execution Plans - tactical drill-down from strategy to action
-- Links to Clarity Method swimlanes for seamless strategy → execution flow

CREATE TABLE IF NOT EXISTS execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Core
  title TEXT NOT NULL,
  objective TEXT,
  
  -- Time
  timeframe TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  target_date TIMESTAMP WITH TIME ZONE,
  
  -- Goals
  goal TEXT,
  success_metrics JSONB, -- { quantitative: [], qualitative: [] }
  
  -- The Plan - nested sections with items
  sections JSONB, -- [{ id, title, items: [{ id, text, done, children, order }], order }]
  
  -- Extra
  notes TEXT,
  rules JSONB, -- string[]
  
  -- Source - link to Clarity Method
  source_swimlane_key TEXT, -- e.g., "gtm", "sales", "teamOrg"
  source_timeframe TEXT, -- e.g., "short", "mid", "long"
  source_clarity_canvas_id UUID REFERENCES clarity_method_canvases(id),
  
  -- AI conversation for this plan
  conversation_id UUID,
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, active, completed, archived
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS execution_plans_client_idx ON execution_plans(client_id);
CREATE INDEX IF NOT EXISTS execution_plans_user_idx ON execution_plans(user_id);
CREATE INDEX IF NOT EXISTS execution_plans_status_idx ON execution_plans(status);

-- Comment
COMMENT ON TABLE execution_plans IS '"Do The Thing" - Tactical execution plans that drill down from strategy (Clarity swimlanes) into actionable nested task lists';
