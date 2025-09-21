-- Add missing description column to cms_sections table
ALTER TABLE public.cms_sections 
ADD COLUMN description text;