-- Add fields for row containers in cms_sections
ALTER TABLE cms_sections 
ADD COLUMN section_type text DEFAULT 'section' CHECK (section_type IN ('section', 'row')),
ADD COLUMN row_column_count integer DEFAULT 1 CHECK (row_column_count >= 1 AND row_column_count <= 4),
ADD COLUMN row_layout_type text DEFAULT 'equal' CHECK (row_layout_type IN ('equal', 'custom'));

-- Add comment for clarity
COMMENT ON COLUMN cms_sections.section_type IS 'Type of section: section (normal content) or row (container for columns)';
COMMENT ON COLUMN cms_sections.row_column_count IS 'Number of columns in row container (1-4)';
COMMENT ON COLUMN cms_sections.row_layout_type IS 'Layout type for row: equal (equal width) or custom (custom widths)';