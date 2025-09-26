-- Add page margin and alignment settings to page_settings table
ALTER TABLE public.page_settings 
ADD COLUMN page_margin integer DEFAULT 16,
ADD COLUMN page_alignment text DEFAULT 'center' CHECK (page_alignment IN ('left', 'center', 'right'));

COMMENT ON COLUMN public.page_settings.page_margin IS 'Page margin in pixels';
COMMENT ON COLUMN public.page_settings.page_alignment IS 'Page alignment: left, center, right';