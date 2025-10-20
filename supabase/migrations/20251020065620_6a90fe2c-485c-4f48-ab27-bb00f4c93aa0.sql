-- Synchronizuj nagłówki: title -> cells[0].content
UPDATE cms_items
SET cells = jsonb_build_array(
  jsonb_build_object(
    'type', 'header',
    'content', title,
    'position', 0,
    'is_active', true
  )
)
WHERE type = 'heading' 
  AND is_active = true
  AND title IS NOT NULL;

-- Synchronizuj teksty: description -> cells[0].content
UPDATE cms_items
SET cells = jsonb_build_array(
  jsonb_build_object(
    'type', 'description',
    'content', description,
    'position', 0,
    'is_active', true
  )
)
WHERE type = 'text' 
  AND is_active = true
  AND description IS NOT NULL;

-- Synchronizuj przyciski: title + url -> cells[0]
UPDATE cms_items
SET cells = jsonb_build_array(
  jsonb_build_object(
    'type', 'button_external',
    'content', COALESCE(title, 'Kliknij'),
    'url', COALESCE(url, '#'),
    'position', 0,
    'is_active', true
  )
)
WHERE type = 'button' 
  AND is_active = true;