-- Add clipboard_content column for "copy to clipboard" reflink type
ALTER TABLE public.reflinks 
ADD COLUMN clipboard_content TEXT;

COMMENT ON COLUMN public.reflinks.clipboard_content IS 'Content to copy to clipboard for clipboard link type';