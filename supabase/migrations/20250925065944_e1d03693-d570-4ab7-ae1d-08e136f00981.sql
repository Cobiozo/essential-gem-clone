-- Add default_expanded field to cms_sections table
ALTER TABLE public.cms_sections ADD COLUMN default_expanded boolean DEFAULT false;