-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role TEXT DEFAULT 'client',
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN email TEXT;

-- Update existing profiles to have default role
UPDATE public.profiles SET role = 'client' WHERE role IS NULL;
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;

-- Create CMS sections table
CREATE TABLE public.cms_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  visible_to_partners BOOLEAN NOT NULL DEFAULT false,
  visible_to_clients BOOLEAN NOT NULL DEFAULT false,
  visible_to_everyone BOOLEAN NOT NULL DEFAULT true,
  visible_to_specjalista BOOLEAN NOT NULL DEFAULT false,
  visible_to_anonymous BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES public.cms_sections(id) ON DELETE CASCADE,
  page_id UUID,
  background_color TEXT,
  text_color TEXT,
  font_size INTEGER,
  alignment TEXT,
  padding INTEGER,
  margin INTEGER,
  border_radius INTEGER,
  style_class TEXT,
  background_gradient TEXT,
  border_width INTEGER,
  border_color TEXT,
  border_style TEXT,
  box_shadow TEXT,
  opacity NUMERIC,
  width_type TEXT,
  custom_width INTEGER,
  height_type TEXT,
  custom_height INTEGER,
  max_width INTEGER,
  font_weight INTEGER,
  line_height NUMERIC,
  letter_spacing NUMERIC,
  text_transform TEXT,
  display_type TEXT,
  justify_content TEXT,
  align_items TEXT,
  gap INTEGER,
  section_margin_top INTEGER,
  section_margin_bottom INTEGER,
  background_image TEXT,
  background_image_opacity NUMERIC,
  background_image_position TEXT,
  background_image_size TEXT,
  icon_name TEXT,
  icon_position TEXT,
  icon_size INTEGER,
  icon_color TEXT,
  show_icon BOOLEAN,
  content_direction TEXT,
  content_wrap TEXT,
  min_height INTEGER,
  overflow_behavior TEXT,
  hover_background_color TEXT,
  hover_background_gradient TEXT,
  hover_text_color TEXT,
  hover_border_color TEXT,
  hover_box_shadow TEXT,
  hover_opacity NUMERIC,
  hover_scale NUMERIC,
  section_type TEXT,
  row_column_count INTEGER DEFAULT 1,
  row_layout_type TEXT,
  default_expanded BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CMS items table
CREATE TABLE public.cms_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES public.cms_sections(id) ON DELETE CASCADE,
  page_id UUID,
  type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  media_url TEXT,
  media_type TEXT,
  media_alt_text TEXT,
  text_formatting JSONB,
  title_formatting JSONB,
  column_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pages table
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  meta_description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  visible_to_partners BOOLEAN NOT NULL DEFAULT false,
  visible_to_clients BOOLEAN NOT NULL DEFAULT false,
  visible_to_everyone BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create page settings table
CREATE TABLE public.page_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_type TEXT NOT NULL UNIQUE,
  layout_mode TEXT DEFAULT 'single',
  column_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for cms_sections
CREATE POLICY "Public sections are viewable by everyone" 
ON public.cms_sections 
FOR SELECT 
USING (visible_to_everyone = true OR visible_to_anonymous = true);

CREATE POLICY "Admin users can manage all sections" 
ON public.cms_sections 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create policies for cms_items
CREATE POLICY "Items are viewable by everyone" 
ON public.cms_items 
FOR SELECT 
USING (true);

CREATE POLICY "Admin users can manage all items" 
ON public.cms_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create policies for pages
CREATE POLICY "Public pages are viewable by everyone" 
ON public.pages 
FOR SELECT 
USING (is_published = true AND is_active = true AND visible_to_everyone = true);

CREATE POLICY "Admin users can manage all pages" 
ON public.pages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create policies for page_settings
CREATE POLICY "Page settings are viewable by everyone" 
ON public.page_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admin users can manage page settings" 
ON public.page_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_cms_sections_updated_at
  BEFORE UPDATE ON public.cms_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_items_updated_at
  BEFORE UPDATE ON public.cms_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_settings_updated_at
  BEFORE UPDATE ON public.page_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default page settings for homepage
INSERT INTO public.page_settings (page_type, layout_mode, column_count)
VALUES ('homepage', 'single', 1);