-- Create a simple settings table for page layout configuration
CREATE TABLE IF NOT EXISTS public.page_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_type TEXT NOT NULL DEFAULT 'homepage',
  layout_mode TEXT NOT NULL DEFAULT 'single',
  column_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_type)
);

-- Enable RLS
ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read settings
CREATE POLICY "Everyone can view page settings" 
ON public.page_settings 
FOR SELECT 
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert page settings" 
ON public.page_settings 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update page settings" 
ON public.page_settings 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Insert default homepage settings
INSERT INTO public.page_settings (page_type, layout_mode, column_count)
VALUES ('homepage', 'single', 1)
ON CONFLICT (page_type) DO NOTHING;