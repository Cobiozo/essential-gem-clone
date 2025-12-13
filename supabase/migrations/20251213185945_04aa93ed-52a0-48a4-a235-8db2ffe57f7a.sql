-- Add collapsible_header column for custom collapsible section header
ALTER TABLE public.cms_sections 
ADD COLUMN IF NOT EXISTS collapsible_header TEXT NULL;