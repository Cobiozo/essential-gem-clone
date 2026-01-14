-- Migracja URL-i training-media z Supabase na lokalny serwer purelife.info.pl

-- 1. Zamiana URL-i z /training-media/ na lokalny serwer
UPDATE cms_items 
SET media_url = REPLACE(
  media_url, 
  'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/', 
  'https://purelife.info.pl/uploads/training-media/'
)
WHERE media_url LIKE '%xzlhssqqbajqhnsmbucf.supabase.co%/training-media/%';

-- 2. Zamiana URL-i z /cms-images/training-media/ na lokalny serwer (ujednolicenie ścieżki)
UPDATE cms_items 
SET media_url = REPLACE(
  media_url, 
  'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/training-media/', 
  'https://purelife.info.pl/uploads/training-media/'
)
WHERE media_url LIKE '%xzlhssqqbajqhnsmbucf.supabase.co%/cms-images/training-media/%';

-- 3. Zamiana URL-i z /cms-videos/training-media/ na lokalny serwer (ujednolicenie ścieżki)
UPDATE cms_items 
SET media_url = REPLACE(
  media_url, 
  'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-videos/training-media/', 
  'https://purelife.info.pl/uploads/training-media/'
)
WHERE media_url LIKE '%xzlhssqqbajqhnsmbucf.supabase.co%/cms-videos/training-media/%';