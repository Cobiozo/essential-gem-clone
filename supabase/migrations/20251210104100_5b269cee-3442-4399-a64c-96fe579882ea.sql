-- Usuń stary constraint
ALTER TABLE public.system_texts 
DROP CONSTRAINT IF EXISTS system_texts_type_check;

-- Dodaj nowy constraint z header_image_size
ALTER TABLE public.system_texts 
ADD CONSTRAINT system_texts_type_check 
CHECK (type = ANY (ARRAY[
  'header_text'::text, 
  'author'::text, 
  'site_logo'::text, 
  'header_image'::text,
  'header_image_size'::text
]));