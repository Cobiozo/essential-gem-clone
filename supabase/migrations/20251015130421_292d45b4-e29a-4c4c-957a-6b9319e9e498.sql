-- Update ALL sections to match homepage modern card design
UPDATE public.cms_sections
SET 
  text_color = '#ffffff',
  font_weight = 600,
  justify_content = 'center',
  align_items = 'center',
  min_height = 200,
  section_margin_top = 16,
  section_margin_bottom = 16,
  icon_color = '#ffffff',
  padding = 32,
  font_size = 20,
  alignment = 'center',
  border_radius = 16,
  box_shadow = '0 4px 20px rgba(0, 0, 0, 0.08)',
  background_gradient = 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
  hover_transition_duration = 300,
  updated_at = now()
WHERE section_type = 'section' 
  AND is_active = true
  AND parent_id IS NULL;