
ALTER TABLE public.training_modules ADD COLUMN language_code TEXT DEFAULT 'pl';
ALTER TABLE public.training_lessons ADD COLUMN language_code TEXT DEFAULT 'pl';
ALTER TABLE public.healthy_knowledge ADD COLUMN language_code TEXT DEFAULT 'pl';
