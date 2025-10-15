-- Import homepage sections to CMS for "Główna" page
-- Page ID: 8f3009d3-3167-423f-8382-3eab1dce8cb1

-- First, let's clear any existing sections for this page to avoid duplicates
DELETE FROM cms_items WHERE section_id IN (
  SELECT id FROM cms_sections WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1'
);
DELETE FROM cms_sections WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1';

-- 1. Hero Section
INSERT INTO cms_sections (
  id, page_id, position, title, description,
  background_color, text_color, alignment, padding, margin,
  is_active, visible_to_everyone, section_type, height_type
) VALUES (
  gen_random_uuid(),
  '8f3009d3-3167-423f-8382-3eab1dce8cb1',
  1,
  'Sekcja Powitalna',
  'Główna sekcja z logo i tekstem powitalnym',
  'hsl(var(--background))',
  'hsl(var(--foreground))',
  'center',
  80,
  0,
  true,
  true,
  'section',
  'auto'
);

-- 2. Team Section
INSERT INTO cms_sections (
  id, page_id, position, title, description,
  background_color, text_color, alignment, padding, section_margin_bottom,
  is_active, visible_to_everyone, section_type, height_type
) VALUES (
  gen_random_uuid(),
  '8f3009d3-3167-423f-8382-3eab1dce8cb1',
  2,
  'Zespół "Pure Life"',
  'Jesteśmy grupą entuzjastów zdrowia naturalnego, którzy wierzą w moc wysokiej jakości suplementów omega-3. Nasza misja to dzielenie się wiedzą i wspieranie Cię w budowaniu swojej kariery.',
  '#f9fafb',
  '#000000',
  'center',
  48,
  0,
  true,
  true,
  'section',
  'auto'
);

-- 3. Learn More Section
INSERT INTO cms_sections (
  id, page_id, position, title, description,
  background_color, text_color, alignment, padding, section_margin_bottom,
  is_active, visible_to_everyone, section_type, height_type
) VALUES (
  gen_random_uuid(),
  '8f3009d3-3167-423f-8382-3eab1dce8cb1',
  3,
  'Dowiedz się więcej',
  'Tu znajdziesz materiały dla wszystkich zainteresowanych omega-3',
  '#ffffff',
  '#000000',
  'center',
  80,
  0,
  true,
  true,
  'section',
  'auto'
);

-- 4. Contact Section
INSERT INTO cms_sections (
  id, page_id, position, title, description,
  background_color, text_color, alignment, padding, section_margin_bottom,
  is_active, visible_to_everyone, section_type, height_type
) VALUES (
  gen_random_uuid(),
  '8f3009d3-3167-423f-8382-3eab1dce8cb1',
  4,
  'Kontakt',
  'W tym miejscu znajdziesz informacje o kontakcie do Pure Life',
  '#f9fafb',
  '#000000',
  'center',
  80,
  0,
  true,
  true,
  'section',
  'auto'
);

-- Now let's add items to Team Section (3 features)
WITH team_section AS (
  SELECT id FROM cms_sections 
  WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1' 
  AND title = 'Zespół "Pure Life"'
)
INSERT INTO cms_items (section_id, position, type, title, description, is_active)
SELECT 
  id,
  1,
  'info_text',
  'Pasja',
  'Wierzymy w siłę naturalnych suplementów i ich wpływ na zdrowie',
  true
FROM team_section
UNION ALL
SELECT 
  id,
  2,
  'info_text',
  'Społeczność',
  'Tworzymy zespół profesjonalistów wspierających się nawzajem',
  true
FROM team_section
UNION ALL
SELECT 
  id,
  3,
  'info_text',
  'Misja',
  'Naszym celem jest poprawa jakości życia przez edukację zdrowotną',
  true
FROM team_section;

-- Add items to Learn More Section (3 collapsible items)
WITH learn_section AS (
  SELECT id FROM cms_sections 
  WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1' 
  AND title = 'Dowiedz się więcej'
)
INSERT INTO cms_items (section_id, position, type, title, description, is_active)
SELECT 
  id,
  1,
  'multi_cell',
  'Materiały edukacyjne',
  'Kompleksowe materiały edukacyjne o omega-3 i zdrowiu',
  true
FROM learn_section
UNION ALL
SELECT 
  id,
  2,
  'multi_cell',
  'Materiały sprzedażowe',
  'Profesjonalne materiały do wspierania sprzedaży',
  true
FROM learn_section
UNION ALL
SELECT 
  id,
  3,
  'multi_cell',
  'Szkolenia wideo',
  'Szkolenia wideo dla partnerów i specjalistów',
  true
FROM learn_section;

-- Add items to Contact Section
WITH contact_section AS (
  SELECT id FROM cms_sections 
  WHERE page_id = '8f3009d3-3167-423f-8382-3eab1dce8cb1' 
  AND title = 'Kontakt'
)
INSERT INTO cms_items (section_id, position, type, title, description, icon, is_active)
SELECT 
  id,
  1,
  'contact_info',
  'Email',
  'kontakt@purelife.info.pl',
  'Mail',
  true
FROM contact_section
UNION ALL
SELECT 
  id,
  2,
  'contact_info',
  'Telefon',
  '+48 123 456 789',
  'Phone',
  true
FROM contact_section
UNION ALL
SELECT 
  id,
  3,
  'contact_info',
  'Lokalizacja',
  'Polska',
  'MapPin',
  true
FROM contact_section
UNION ALL
SELECT 
  id,
  4,
  'info_text',
  'Osoba do kontaktu',
  'Sebastian Snopek',
  NULL,
  true
FROM contact_section;