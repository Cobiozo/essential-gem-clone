-- Add favicon and og:image support to page_settings
ALTER TABLE page_settings 
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS og_image_url TEXT;