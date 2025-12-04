-- Add text_align column to cms_items table for element alignment support
ALTER TABLE public.cms_items ADD COLUMN IF NOT EXISTS text_align TEXT DEFAULT NULL;