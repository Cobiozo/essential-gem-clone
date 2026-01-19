-- Add allow_invites column for controlling invite button visibility per event
ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_invites BOOLEAN DEFAULT false;

-- Add publish_at column for scheduled publication
ALTER TABLE events ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ DEFAULT NULL;

-- Add app_base_url to page_settings for centralized URL configuration
ALTER TABLE page_settings ADD COLUMN IF NOT EXISTS app_base_url TEXT DEFAULT 'https://purelife.lovable.app';

-- Update existing events to have allow_invites based on event_type (webinar/team_training get true for backwards compatibility)
UPDATE events SET allow_invites = true WHERE event_type IN ('webinar', 'team_training');

COMMENT ON COLUMN events.allow_invites IS 'Controls whether the Invite button is shown for this event';
COMMENT ON COLUMN events.publish_at IS 'Scheduled publication date/time. If set and is_published=false, event will be auto-published at this time';
COMMENT ON COLUMN page_settings.app_base_url IS 'Base URL for the application, used in email links';