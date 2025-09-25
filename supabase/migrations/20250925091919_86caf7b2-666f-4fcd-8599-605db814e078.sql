-- Zwiększ liczbę kolumn w wierszu z 2 na 3, aby pomieścić wszystkie sekcje
UPDATE cms_sections 
SET row_column_count = 3, updated_at = now() 
WHERE id = '2da37393-56fe-4ade-be8c-2f93165e2577' AND section_type = 'row';