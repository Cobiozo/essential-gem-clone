
-- Fix cms_items without page_id by inheriting from their section
UPDATE cms_items
SET page_id = (
  SELECT page_id 
  FROM cms_sections 
  WHERE cms_sections.id = cms_items.section_id
)
WHERE page_id IS NULL 
  AND section_id IS NOT NULL;

-- Delete orphaned items that have no section or section with no page
DELETE FROM cms_items
WHERE page_id IS NULL;

-- Add NOT NULL constraint to page_id in cms_items
ALTER TABLE cms_items 
ALTER COLUMN page_id SET NOT NULL;

-- Add NOT NULL constraint to page_id in cms_sections
ALTER TABLE cms_sections 
ALTER COLUMN page_id SET NOT NULL;

-- Add comment explaining the constraint
COMMENT ON COLUMN cms_items.page_id IS 'Every CMS item must belong to a specific page. This ensures proper isolation between pages.';
COMMENT ON COLUMN cms_sections.page_id IS 'Every CMS section must belong to a specific page. This ensures proper isolation between pages.';
