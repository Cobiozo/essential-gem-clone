-- Add new columns for enhanced section display options
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS section_margin_bottom INTEGER DEFAULT 24;
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS section_margin_top INTEGER DEFAULT 24;
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS background_image TEXT;
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS background_image_opacity INTEGER DEFAULT 100;
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS background_image_position TEXT DEFAULT 'center';
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS background_image_size TEXT DEFAULT 'cover';
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS icon_name TEXT;
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS icon_position TEXT DEFAULT 'left';
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS icon_size INTEGER DEFAULT 24;
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS icon_color TEXT;
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS show_icon BOOLEAN DEFAULT false;
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS content_direction TEXT DEFAULT 'column';
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS content_wrap TEXT DEFAULT 'nowrap';
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS min_height INTEGER DEFAULT 0;
ALTER TABLE public.cms_sections ADD COLUMN IF NOT EXISTS overflow_behavior TEXT DEFAULT 'visible';