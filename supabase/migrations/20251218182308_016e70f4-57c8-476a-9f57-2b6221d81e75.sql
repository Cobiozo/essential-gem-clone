-- Create cms_section_translations table for multilingual section support
CREATE TABLE public.cms_section_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.cms_sections(id) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES public.i18n_languages(code) ON DELETE CASCADE,
  title text,
  description text,
  collapsible_header text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(section_id, language_code)
);

-- Enable RLS
ALTER TABLE public.cms_section_translations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view CMS section translations"
  ON public.cms_section_translations
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage CMS section translations"
  ON public.cms_section_translations
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create index for performance
CREATE INDEX idx_cms_section_translations_section_lang 
  ON public.cms_section_translations(section_id, language_code);

-- Trigger for updated_at
CREATE TRIGGER update_cms_section_translations_updated_at
  BEFORE UPDATE ON public.cms_section_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();