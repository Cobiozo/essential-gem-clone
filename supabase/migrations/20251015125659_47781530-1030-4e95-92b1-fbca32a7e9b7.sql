-- Update existing sections to have modern card styling like on homepage
UPDATE public.cms_sections
SET 
  background_gradient = 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
  text_color = '#ffffff',
  font_size = COALESCE(font_size, 20),
  font_weight = COALESCE(font_weight, 600),
  alignment = COALESCE(alignment, 'center'),
  padding = COALESCE(padding, 32),
  border_radius = COALESCE(border_radius, 16),
  box_shadow = '0 4px 20px rgba(0, 0, 0, 0.08)',
  justify_content = COALESCE(justify_content, 'center'),
  align_items = COALESCE(align_items, 'center'),
  min_height = COALESCE(min_height, 200),
  section_margin_top = COALESCE(section_margin_top, 16),
  section_margin_bottom = COALESCE(section_margin_bottom, 16),
  icon_color = COALESCE(icon_color, '#ffffff'),
  hover_transition_duration = COALESCE(hover_transition_duration, 300),
  updated_at = now()
WHERE section_type = 'section' 
  AND is_active = true
  AND (background_gradient IS NULL OR background_gradient = '' OR background_gradient = 'none');