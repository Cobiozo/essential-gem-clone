-- Drop old constraint and add new one with 'clipboard' value
ALTER TABLE public.reflinks DROP CONSTRAINT reflinks_link_type_check;

ALTER TABLE public.reflinks ADD CONSTRAINT reflinks_link_type_check 
  CHECK (link_type = ANY (ARRAY['reflink'::text, 'internal'::text, 'external'::text, 'clipboard'::text]));