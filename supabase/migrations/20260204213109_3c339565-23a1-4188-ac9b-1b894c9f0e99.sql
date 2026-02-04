-- Add OG meta tag columns to page_settings table
ALTER TABLE page_settings 
ADD COLUMN IF NOT EXISTS og_title TEXT DEFAULT 'Pure Life Center',
ADD COLUMN IF NOT EXISTS og_description TEXT DEFAULT 'Zmieniamy życie i zdrowie ludzi na lepsze',
ADD COLUMN IF NOT EXISTS og_site_name TEXT DEFAULT 'Pure Life Center',
ADD COLUMN IF NOT EXISTS og_url TEXT DEFAULT 'https://purelife.info.pl';

-- Update existing homepage record with new OG values
UPDATE page_settings 
SET 
  og_title = 'Pure Life Center',
  og_description = 'Zmieniamy życie i zdrowie ludzi na lepsze',
  og_site_name = 'Pure Life Center',
  og_url = 'https://purelife.info.pl'
WHERE page_type = 'homepage';