-- Fix row_column_count based on titles and actual children count
UPDATE cms_sections
SET row_column_count = 3
WHERE section_type = 'row'
  AND title ILIKE '%3-kolumnowy%'
  AND page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1';

UPDATE cms_sections
SET row_column_count = 2
WHERE section_type = 'row'
  AND title ILIKE '%2-kolumnowy%'
  AND page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1';

-- For other rows, set row_column_count to the maximum of 1 or actual children count
UPDATE cms_sections AS parent
SET row_column_count = GREATEST(1, (
  SELECT COUNT(*)
  FROM cms_sections AS child
  WHERE child.parent_id = parent.id
))
WHERE parent.section_type = 'row'
  AND parent.page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1'
  AND parent.title NOT ILIKE '%kolumnowy%';