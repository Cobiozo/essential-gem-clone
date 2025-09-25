-- Make section title optional (nullable)
ALTER TABLE public.cms_sections ALTER COLUMN title DROP NOT NULL;