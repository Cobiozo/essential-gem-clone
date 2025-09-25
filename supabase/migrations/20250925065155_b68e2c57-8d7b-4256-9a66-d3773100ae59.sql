-- Recreate "Terminarz" item in "TERMINARZ DLA KLIENTA" if missing
WITH sec AS (
  SELECT id FROM public.cms_sections WHERE title = 'TERMINARZ DLA KLIENTA' LIMIT 1
),
ins AS (
  INSERT INTO public.cms_items (section_id, type, title, description, position, is_active, page_id, column_index)
  SELECT sec.id, 'button', 'Terminarz', 'Przejdź do terminarza',
         COALESCE((SELECT MAX(position) FROM public.cms_items WHERE section_id = sec.id) + 1, 0),
         true, NULL, 0
  FROM sec
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cms_items WHERE section_id = sec.id AND lower(title) = 'terminarz'
  )
  RETURNING id
)
SELECT * FROM ins;