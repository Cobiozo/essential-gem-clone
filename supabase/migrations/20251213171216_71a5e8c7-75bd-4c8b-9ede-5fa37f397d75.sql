-- Add new columns to reflinks table for extended functionality
ALTER TABLE public.reflinks 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS link_url text,
ADD COLUMN IF NOT EXISTS link_type text DEFAULT 'reflink' CHECK (link_type IN ('reflink', 'internal', 'external')),
ADD COLUMN IF NOT EXISTS visible_to_roles text[] DEFAULT ARRAY['partner', 'specjalista']::text[],
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.reflinks.title IS 'Display title for the reflink';
COMMENT ON COLUMN public.reflinks.image_url IS 'Optional image/icon URL';
COMMENT ON COLUMN public.reflinks.link_url IS 'Custom URL for internal/external links';
COMMENT ON COLUMN public.reflinks.link_type IS 'Type: reflink (auth?ref=), internal, or external';
COMMENT ON COLUMN public.reflinks.visible_to_roles IS 'Which user roles can see this reflink';
COMMENT ON COLUMN public.reflinks.position IS 'Order position within target_role group';