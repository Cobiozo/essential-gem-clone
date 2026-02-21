
-- 1a. Kolumna training_language w profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS training_language TEXT DEFAULT NULL;

-- 1b. Kolumna language_code w certificates
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'pl';

-- 1c. Kolumna language_code w certificate_templates
ALTER TABLE public.certificate_templates ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'pl';

-- 1d. Update existing certificates to Polish
UPDATE public.certificates SET language_code = 'pl' WHERE language_code IS NULL;

-- 1e. Update existing certificate_templates to Polish
UPDATE public.certificate_templates SET language_code = 'pl' WHERE language_code IS NULL;
