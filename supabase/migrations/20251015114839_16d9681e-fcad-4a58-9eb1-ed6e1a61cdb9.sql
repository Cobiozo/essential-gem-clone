-- MIGRACJA: Unifikacja sekcji CMS na stronie głównej
-- Cel: Połączenie systemu wierszowego (page_id: null) z nowymi sekcjami (page_id: 8f3009d3-3167-423f-8382-3eab1dce8cb1)

-- Krok 1: Zaktualizuj pozycje istniejących płaskich sekcji (przesuwamy z 1-4 na 8-11)
UPDATE cms_sections 
SET position = position + 7, updated_at = now()
WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1' 
  AND parent_id IS NULL
  AND is_active = true;

-- Krok 2: Przypisz page_id i ustaw pozycje dla wierszy (pozycje 1-7)
UPDATE cms_sections 
SET 
  page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1',
  position = CASE id
    WHEN 'c196132e-b32d-4b95-9d56-ef1e56772200' THEN 1  -- Wiersz 3-kolumnowy
    WHEN '6047778c-8c50-445f-9a29-b1eaa2561ceb' THEN 2  -- Wiersz 2-kolumnowy  
    WHEN '07b30a09-a578-4bd4-991d-ef1870c2e64b' THEN 3  -- Wiersz 3-kolumnowy
    WHEN '2da37393-56fe-4ade-be8c-2f93165e2577' THEN 4  -- Wiersz 1-kolumnowy
    WHEN 'b26c9b15-d6e3-49f8-bfaf-1546698c1184' THEN 5  -- Wiersz 1-kolumnowy
    WHEN '95c6655a-d8fe-4f62-940c-6e0dc7975ae7' THEN 6  -- Wiersz 1-kolumnowy
    WHEN '4e1d2c17-2aa1-422c-85e0-3c08b9d50abf' THEN 7  -- Wiersz 1-kolumnowy
    ELSE position
  END,
  updated_at = now()
WHERE page_id IS NULL 
  AND section_type = 'row'
  AND parent_id IS NULL
  AND is_active = true;

-- Krok 3: Przypisz page_id do zagnieżdżonych sekcji (dzieci wierszy)
UPDATE cms_sections 
SET page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1', updated_at = now()
WHERE page_id IS NULL 
  AND parent_id IS NOT NULL
  AND is_active = true;

-- Krok 4: Przypisz page_id do wszystkich itemów z tych sekcji
UPDATE cms_items
SET page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1', updated_at = now()
WHERE page_id IS NULL 
  AND is_active = true
  AND section_id IN (
    SELECT id FROM cms_sections 
    WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1'
  );