-- Update all homepage sections (except WITAMY) to have modern style
UPDATE cms_sections
SET 
  background_color = 'hsl(0, 0%, 100%)',
  text_color = 'hsl(0, 0%, 0%)',
  icon_color = 'hsl(45, 100%, 51%)',
  show_icon = true,
  icon_name = 'Circle',
  border_radius = 12,
  box_shadow = '0 2px 8px rgba(0, 0, 0, 0.1)',
  padding = 20,
  hover_background_color = 'hsl(0, 0%, 98%)',
  updated_at = now()
WHERE page_id IS NULL 
  AND is_active = true 
  AND section_type = 'section'
  AND LOWER(title) NOT LIKE '%witamy%';

-- Update WITAMY section to have transparent/minimal styling
UPDATE cms_sections
SET 
  background_color = 'transparent',
  text_color = 'hsl(0, 0%, 0%)',
  show_icon = false,
  border_radius = 0,
  box_shadow = 'none',
  padding = 24,
  updated_at = now()
WHERE page_id IS NULL 
  AND is_active = true 
  AND section_type = 'section'
  AND LOWER(title) LIKE '%witamy%';