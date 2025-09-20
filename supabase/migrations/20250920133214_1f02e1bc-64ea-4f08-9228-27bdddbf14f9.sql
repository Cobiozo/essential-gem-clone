-- Add page relationship to cms_sections and cms_items
-- This will allow pages to have their own CMS content structure

-- First, add page_id column to cms_sections (nullable for backward compatibility)
ALTER TABLE cms_sections ADD COLUMN page_id UUID REFERENCES pages(id) ON DELETE CASCADE;

-- Add page_id column to cms_items (nullable for backward compatibility)
ALTER TABLE cms_items ADD COLUMN page_id UUID REFERENCES pages(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_cms_sections_page_id ON cms_sections(page_id);
CREATE INDEX idx_cms_items_page_id ON cms_items(page_id);

-- Update RLS policies for cms_sections to handle page-specific content
DROP POLICY IF EXISTS "Anyone can view active CMS sections" ON cms_sections;
DROP POLICY IF EXISTS "Only admins can manage CMS sections" ON cms_sections;

CREATE POLICY "Anyone can view active CMS sections"
ON cms_sections FOR SELECT
USING (is_active = true);

CREATE POLICY "Only admins can manage CMS sections"
ON cms_sections FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Update RLS policies for cms_items to handle page-specific content
DROP POLICY IF EXISTS "Anyone can view active CMS items" ON cms_items;
DROP POLICY IF EXISTS "Only admins can manage CMS items" ON cms_items;

CREATE POLICY "Anyone can view active CMS items"
ON cms_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Only admins can manage CMS items"
ON cms_items FOR ALL
USING (is_admin())
WITH CHECK (is_admin());