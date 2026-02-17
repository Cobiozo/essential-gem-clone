
-- Training module translations
CREATE TABLE public.training_module_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.i18n_languages(code) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, language_code)
);

-- Training lesson translations
CREATE TABLE public.training_lesson_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.i18n_languages(code) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  media_alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, language_code)
);

-- Knowledge resource translations
CREATE TABLE public.knowledge_resource_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.knowledge_resources(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.i18n_languages(code) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  context_of_use TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resource_id, language_code)
);

-- Healthy knowledge translations
CREATE TABLE public.healthy_knowledge_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.healthy_knowledge(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES public.i18n_languages(code) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  text_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, language_code)
);

-- Enable RLS on all tables
ALTER TABLE public.training_module_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lesson_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_resource_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healthy_knowledge_translations ENABLE ROW LEVEL SECURITY;

-- SELECT policies (everyone authenticated can read)
CREATE POLICY "Anyone can read training module translations"
  ON public.training_module_translations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read training lesson translations"
  ON public.training_lesson_translations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read knowledge resource translations"
  ON public.knowledge_resource_translations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read healthy knowledge translations"
  ON public.healthy_knowledge_translations FOR SELECT TO authenticated USING (true);

-- Admin full access policies
CREATE POLICY "Admins can manage training module translations"
  ON public.training_module_translations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage training lesson translations"
  ON public.training_lesson_translations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage knowledge resource translations"
  ON public.knowledge_resource_translations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage healthy knowledge translations"
  ON public.healthy_knowledge_translations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_training_module_translations_updated_at
  BEFORE UPDATE ON public.training_module_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_training_lesson_translations_updated_at
  BEFORE UPDATE ON public.training_lesson_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_knowledge_resource_translations_updated_at
  BEFORE UPDATE ON public.knowledge_resource_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_healthy_knowledge_translations_updated_at
  BEFORE UPDATE ON public.healthy_knowledge_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_training_module_translations_module_lang ON public.training_module_translations(module_id, language_code);
CREATE INDEX idx_training_lesson_translations_lesson_lang ON public.training_lesson_translations(lesson_id, language_code);
CREATE INDEX idx_knowledge_resource_translations_resource_lang ON public.knowledge_resource_translations(resource_id, language_code);
CREATE INDEX idx_healthy_knowledge_translations_item_lang ON public.healthy_knowledge_translations(item_id, language_code);
