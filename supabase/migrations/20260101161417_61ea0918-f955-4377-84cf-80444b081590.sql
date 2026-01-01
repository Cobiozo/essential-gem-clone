-- Indexes for pages table to reduce sequential scans
CREATE INDEX IF NOT EXISTS idx_pages_is_published_active 
ON pages(is_published, is_active) WHERE is_published = true AND is_active = true;

-- Indexes for system_texts table
CREATE INDEX IF NOT EXISTS idx_system_texts_type ON system_texts(type);
CREATE INDEX IF NOT EXISTS idx_system_texts_is_active ON system_texts(is_active);