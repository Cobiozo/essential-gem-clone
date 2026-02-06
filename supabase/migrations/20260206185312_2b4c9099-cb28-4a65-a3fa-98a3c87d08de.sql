-- Add advanced push notification settings columns
ALTER TABLE public.push_notification_config
ADD COLUMN IF NOT EXISTS vibration_pattern text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS ttl_seconds integer DEFAULT 86400,
ADD COLUMN IF NOT EXISTS require_interaction boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS silent boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.push_notification_config.vibration_pattern IS 'Vibration pattern: short, standard, long, urgent, off';
COMMENT ON COLUMN public.push_notification_config.ttl_seconds IS 'Time to live in seconds for push notifications (default 24h = 86400)';
COMMENT ON COLUMN public.push_notification_config.require_interaction IS 'If true, notification stays until user interacts';
COMMENT ON COLUMN public.push_notification_config.silent IS 'If true, notification is silent (no sound)';