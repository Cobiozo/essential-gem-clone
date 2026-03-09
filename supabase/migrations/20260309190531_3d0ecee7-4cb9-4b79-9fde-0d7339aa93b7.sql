ALTER TABLE auto_webinar_config 
ADD COLUMN IF NOT EXISTS room_custom_section_title TEXT,
ADD COLUMN IF NOT EXISTS room_custom_section_content TEXT;