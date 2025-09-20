-- Add content formatting column to pages table
ALTER TABLE public.pages 
ADD COLUMN content_formatting jsonb;