
-- Fix row_column_count based on actual number of children
UPDATE cms_sections
SET row_column_count = (
  SELECT GREATEST(1, COUNT(DISTINCT cs.id))
  FROM cms_sections cs
  WHERE cs.parent_id = cms_sections.id
)
WHERE section_type = 'row' 
  AND page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1';

-- Fix child positions to be sequential (0, 1, 2, ...) within each row
WITH ranked_children AS (
  SELECT 
    id,
    parent_id,
    ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY position, id) - 1 as new_position
  FROM cms_sections
  WHERE parent_id IS NOT NULL
    AND page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1'
)
UPDATE cms_sections
SET position = rc.new_position
FROM ranked_children rc
WHERE cms_sections.id = rc.id;
