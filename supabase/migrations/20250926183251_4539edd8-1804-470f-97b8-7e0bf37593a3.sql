-- Add 'header_image' to the allowed system_texts types
ALTER TABLE public.system_texts DROP CONSTRAINT IF EXISTS system_texts_type_check;

-- Recreate the constraint with 'header_image' included
ALTER TABLE public.system_texts 
ADD CONSTRAINT system_texts_type_check 
CHECK (type IN ('header_text', 'author', 'site_logo', 'header_image'));