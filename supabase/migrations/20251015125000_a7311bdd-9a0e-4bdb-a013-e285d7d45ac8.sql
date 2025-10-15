-- Update new sections to have default styling values
UPDATE cms_sections
SET 
  border_radius = COALESCE(border_radius, 16),
  box_shadow = CASE 
    WHEN box_shadow = 'none' OR box_shadow IS NULL 
    THEN '0 4px 20px rgba(0, 0, 0, 0.08)'
    ELSE box_shadow
  END,
  background_gradient = CASE
    WHEN background_gradient IS NULL AND section_type = 'section'
    THEN 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)'
    ELSE background_gradient
  END,
  min_height = COALESCE(min_height, 200),
  font_size = COALESCE(font_size, 20),
  font_weight = COALESCE(font_weight, 600),
  line_height = COALESCE(line_height, 1.5),
  letter_spacing = COALESCE(letter_spacing, 0),
  gap = COALESCE(gap, 16),
  section_margin_top = COALESCE(section_margin_top, 16),
  section_margin_bottom = COALESCE(section_margin_bottom, 16),
  justify_content = COALESCE(justify_content, 'center'),
  align_items = COALESCE(align_items, 'center'),
  alignment = COALESCE(alignment, 'center'),
  hover_transition_duration = COALESCE(hover_transition_duration, 300)
WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1'
  AND section_type = 'section';