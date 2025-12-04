-- Add show_title column to cms_sections table
ALTER TABLE public.cms_sections 
ADD COLUMN show_title boolean DEFAULT true;