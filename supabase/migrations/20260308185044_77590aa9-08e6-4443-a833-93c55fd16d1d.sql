
-- Add slug column to events table for short URLs
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate slugs for existing events based on title + short id
UPDATE public.events 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        LEFT(title, 50),
        '[ąĄ]', 'a', 'g'
      ),
      '[ęĘ]', 'e', 'g'
    ),
    '[^a-zA-Z0-9\s-]', '', 'g'
  )
) || '-' || LEFT(id::text, 8)
WHERE slug IS NULL;

-- Replace spaces with hyphens and clean up
UPDATE public.events 
SET slug = REGEXP_REPLACE(TRIM(BOTH '-' FROM REGEXP_REPLACE(slug, '\s+', '-', 'g')), '-+', '-', 'g')
WHERE slug IS NOT NULL;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
