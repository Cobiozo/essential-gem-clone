-- Create i18n_languages table
CREATE TABLE public.i18n_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT,
  flag_emoji TEXT DEFAULT '🏳️',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create i18n_translations table
CREATE TABLE public.i18n_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language_code TEXT NOT NULL REFERENCES public.i18n_languages(code) ON DELETE CASCADE,
  namespace TEXT NOT NULL DEFAULT 'common',
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(language_code, namespace, key)
);

-- Enable RLS
ALTER TABLE public.i18n_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.i18n_translations ENABLE ROW LEVEL SECURITY;

-- RLS policies for i18n_languages
CREATE POLICY "Admins can manage languages" ON public.i18n_languages
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view active languages" ON public.i18n_languages
  FOR SELECT USING (is_active = true);

-- RLS policies for i18n_translations
CREATE POLICY "Admins can manage translations" ON public.i18n_translations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view translations" ON public.i18n_translations
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_i18n_translations_language ON public.i18n_translations(language_code);
CREATE INDEX idx_i18n_translations_namespace ON public.i18n_translations(namespace);
CREATE INDEX idx_i18n_translations_key ON public.i18n_translations(key);
CREATE INDEX idx_i18n_translations_lookup ON public.i18n_translations(language_code, namespace, key);

-- Insert default languages
INSERT INTO public.i18n_languages (code, name, native_name, flag_emoji, is_default, position) VALUES
  ('pl', 'Polish', 'Polski', '🇵🇱', true, 0),
  ('en', 'English', 'English', '🇬🇧', false, 1),
  ('de', 'German', 'Deutsch', '🇩🇪', false, 2);

-- Create trigger for updated_at
CREATE TRIGGER update_i18n_languages_updated_at
  BEFORE UPDATE ON public.i18n_languages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_i18n_translations_updated_at
  BEFORE UPDATE ON public.i18n_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();