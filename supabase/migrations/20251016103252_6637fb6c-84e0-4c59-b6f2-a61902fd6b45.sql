-- Pozwól elementom być dodawanymi bezpośrednio do wierszy (rows)
-- Usuń istniejący constraint i pozwól section_id wskazywać na row lub section

-- 1. Najpierw usuń istniejący foreign key constraint
ALTER TABLE cms_items DROP CONSTRAINT IF EXISTS cms_items_section_id_fkey;

-- 2. Dodaj nowy constraint który pozwala na row lub section
ALTER TABLE cms_items 
ADD CONSTRAINT cms_items_section_id_fkey 
FOREIGN KEY (section_id) 
REFERENCES cms_sections(id) 
ON DELETE CASCADE;

-- Komentarz: Teraz section_id może wskazywać na dowolną cms_section 
-- (niezależnie czy to row, section, container czy grid)