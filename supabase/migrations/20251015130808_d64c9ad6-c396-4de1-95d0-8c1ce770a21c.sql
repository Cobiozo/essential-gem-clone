-- Reset section styles to match homepage - white background, black text, no gradients for flat sections
UPDATE public.cms_sections
SET 
  background_gradient = NULL,
  background_color = '#ffffff',
  text_color = '#000000',
  font_size = 16,
  font_weight = 400,
  alignment = 'left',
  padding = 48,
  justify_content = 'start',
  align_items = 'start',
  min_height = 0,
  border_radius = 0,
  box_shadow = 'none',
  section_margin_top = 0,
  section_margin_bottom = 0,
  hover_transition_duration = 300,
  updated_at = now()
WHERE section_type = 'section' 
  AND is_active = true
  AND parent_id IS NULL;