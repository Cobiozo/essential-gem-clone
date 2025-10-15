
-- Enable anonymous visibility for all child sections that should be visible
UPDATE cms_sections
SET visible_to_anonymous = true
WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1'
  AND parent_id IS NOT NULL
  AND section_type = 'section';

-- Also enable for parent rows to ensure they're visible
UPDATE cms_sections  
SET visible_to_anonymous = true
WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1'
  AND section_type = 'row'
  AND parent_id IS NULL;

-- Enable for flat sections on homepage
UPDATE cms_sections
SET visible_to_anonymous = true  
WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1'
  AND section_type = 'section'
  AND parent_id IS NULL;
