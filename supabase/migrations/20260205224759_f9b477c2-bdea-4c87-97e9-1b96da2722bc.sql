-- Add Open Graph columns to html_pages
ALTER TABLE public.html_pages ADD COLUMN IF NOT EXISTS og_image text;
ALTER TABLE public.html_pages ADD COLUMN IF NOT EXISTS og_title text;
ALTER TABLE public.html_pages ADD COLUMN IF NOT EXISTS og_description text;

-- Update existing legal pages to be visible to anonymous users
UPDATE public.html_pages 
SET visible_to_anonymous = true 
WHERE slug IN ('regulamin', 'polityka-prywatnosci', 'informacje-dla-klienta');

-- Add RLS policy allowing anonymous access to pages marked as visible_to_anonymous
DROP POLICY IF EXISTS "Anonymous users can view public pages" ON public.html_pages;
CREATE POLICY "Anonymous users can view public pages" 
ON public.html_pages 
FOR SELECT 
USING (
  is_published = true 
  AND is_active = true 
  AND visible_to_anonymous = true
);

-- Ensure RLS is enabled
ALTER TABLE public.html_pages ENABLE ROW LEVEL SECURITY;