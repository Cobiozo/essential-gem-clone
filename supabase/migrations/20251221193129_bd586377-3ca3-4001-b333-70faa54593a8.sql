-- Add specialist search settings and searchable fields
-- Add searchable fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS specialization text,
ADD COLUMN IF NOT EXISTS profile_description text,
ADD COLUMN IF NOT EXISTS search_keywords text[],
ADD COLUMN IF NOT EXISTS is_searchable boolean DEFAULT true;

-- Create specialist search settings table
CREATE TABLE public.specialist_search_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  visible_to_clients boolean NOT NULL DEFAULT true,
  visible_to_partners boolean NOT NULL DEFAULT true,
  visible_to_specjalista boolean NOT NULL DEFAULT true,
  visible_to_anonymous boolean NOT NULL DEFAULT false,
  max_results integer NOT NULL DEFAULT 20,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.specialist_search_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for settings
CREATE POLICY "Admins can manage specialist search settings"
  ON public.specialist_search_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Everyone can view specialist search settings"
  ON public.specialist_search_settings FOR SELECT
  USING (true);

-- Insert default settings
INSERT INTO public.specialist_search_settings (is_enabled) VALUES (true);

-- Create index for faster specialist queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_searchable 
  ON public.profiles(role, is_searchable) 
  WHERE role = 'specialist' AND is_searchable = true;