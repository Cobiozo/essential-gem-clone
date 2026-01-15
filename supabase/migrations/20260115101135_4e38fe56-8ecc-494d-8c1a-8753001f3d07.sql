-- Usuń stary constraint
ALTER TABLE public.reflinks 
DROP CONSTRAINT IF EXISTS reflinks_link_type_check;

-- Dodaj nowy constraint z wartością 'infolink'
ALTER TABLE public.reflinks 
ADD CONSTRAINT reflinks_link_type_check 
CHECK (link_type = ANY (ARRAY['reflink'::text, 'internal'::text, 'external'::text, 'clipboard'::text, 'infolink'::text]));