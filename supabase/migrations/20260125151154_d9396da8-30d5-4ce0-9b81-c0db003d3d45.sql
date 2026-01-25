-- Add language_code column to knowledge_resources table
-- Supports 7 languages: pl, en, de, it, es, fr, pt
-- NULL means document is visible in all languages (universal)
-- Default 'pl' for existing documents

ALTER TABLE public.knowledge_resources 
ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'pl';

-- Add comment for documentation
COMMENT ON COLUMN public.knowledge_resources.language_code IS 'Language code for the document (pl, en, de, it, es, fr, pt) or NULL for universal documents visible in all languages';