-- Add button fields and title_custom_color to important_info_banners
ALTER TABLE public.important_info_banners 
ADD COLUMN IF NOT EXISTS button_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS button_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS button_icon TEXT DEFAULT NULL;