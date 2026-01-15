-- Client Portals / External Sharing
-- Allows consultants to create secure, token-based sharing portals for their clients

-- Client Portals - the main workspace/portal for each client
CREATE TABLE IF NOT EXISTS client_portals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id),

    -- Access token (used in URL)
    access_token TEXT NOT NULL UNIQUE,

    -- Portal settings
    name TEXT,
    welcome_message TEXT,
    brand_color TEXT,

    -- Access control
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,

    -- Analytics
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shared Items - individual items shared in a portal
CREATE TABLE IF NOT EXISTS shared_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL REFERENCES client_portals(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),

    -- Item reference
    item_type TEXT NOT NULL, -- 'execution_plan', 'clarity_canvas', 'source', 'note'
    item_id UUID NOT NULL,

    -- Display settings
    display_name TEXT,
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,

    -- Deep link token
    deep_link_token TEXT UNIQUE,

    -- Analytics
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Portal Access Logs - track access for analytics
CREATE TABLE IF NOT EXISTS portal_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL REFERENCES client_portals(id) ON DELETE CASCADE,
    shared_item_id UUID REFERENCES shared_items(id) ON DELETE SET NULL,

    -- Access details
    access_type TEXT NOT NULL, -- 'portal_view', 'item_view', 'download'
    ip_address TEXT,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS client_portals_client_idx ON client_portals(client_id);
CREATE INDEX IF NOT EXISTS client_portals_token_idx ON client_portals(access_token);
CREATE INDEX IF NOT EXISTS shared_items_portal_idx ON shared_items(portal_id);
CREATE INDEX IF NOT EXISTS shared_items_item_idx ON shared_items(item_id);
CREATE INDEX IF NOT EXISTS shared_items_deep_link_idx ON shared_items(deep_link_token);
CREATE INDEX IF NOT EXISTS portal_access_logs_portal_idx ON portal_access_logs(portal_id);
