ALTER TABLE auto_webinar_config
  ADD COLUMN IF NOT EXISTS slot_hours text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS room_open_minutes_before integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS countdown_minutes_before integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS link_expiry_minutes integer DEFAULT 10;