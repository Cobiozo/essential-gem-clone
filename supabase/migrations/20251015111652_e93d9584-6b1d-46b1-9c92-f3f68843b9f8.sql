-- Dodanie cms_items dla strony głównej "Główna"
-- Najpierw pobierzmy ID sekcji (zakładając, że migracja już została uruchomiona)

-- Items dla sekcji "Zespół Pure Life" (146c88fb-dc9d-4e6c-9b08-df54895cc000)
INSERT INTO cms_items (
  section_id, 
  page_id, 
  type, 
  title, 
  description, 
  icon, 
  position, 
  is_active,
  column_index
) VALUES
  (
    '146c88fb-dc9d-4e6c-9b08-df54895cc000',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'info_text',
    'Pasja',
    'Wierzymy w siłę naturalnych suplementów i ich wpływ na zdrowie',
    'Heart',
    0,
    true,
    0
  ),
  (
    '146c88fb-dc9d-4e6c-9b08-df54895cc000',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'info_text',
    'Społeczność',
    'Tworzymy zespół profesjonalistów wspierających się nawzajem',
    'Users',
    1,
    true,
    0
  ),
  (
    '146c88fb-dc9d-4e6c-9b08-df54895cc000',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'info_text',
    'Misja',
    'Naszym celem jest poprawa jakości życia przez edukację zdrowotną',
    'Target',
    2,
    true,
    0
  );

-- Items dla sekcji "Dowiedz się więcej" (9a04ff91-d5b4-4881-92ef-020538be0258)
INSERT INTO cms_items (
  section_id, 
  page_id, 
  type, 
  title, 
  description, 
  position, 
  is_active,
  column_index,
  cells
) VALUES
  (
    '9a04ff91-d5b4-4881-92ef-020538be0258',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'multi_cell',
    'Materiały edukacyjne',
    'Kompleksowe materiały edukacyjne o omega-3 i zdrowiu',
    0,
    true,
    0,
    '[]'::jsonb
  ),
  (
    '9a04ff91-d5b4-4881-92ef-020538be0258',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'multi_cell',
    'Materiały sprzedażowe',
    'Profesjonalne materiały do wspierania sprzedaży',
    1,
    true,
    0,
    '[]'::jsonb
  ),
  (
    '9a04ff91-d5b4-4881-92ef-020538be0258',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'multi_cell',
    'Szkolenia wideo',
    'Szkolenia wideo dla partnerów i specjalistów',
    2,
    true,
    0,
    '[]'::jsonb
  );

-- Items dla sekcji "Kontakt" (08b07156-ef06-45ba-8fcc-41c2372162dc)
INSERT INTO cms_items (
  section_id, 
  page_id, 
  type, 
  title, 
  description,
  url,
  icon,
  position, 
  is_active,
  column_index
) VALUES
  (
    '08b07156-ef06-45ba-8fcc-41c2372162dc',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'info_text',
    'Email',
    'kontakt@purelife.info.pl',
    'mailto:kontakt@purelife.info.pl',
    'Mail',
    0,
    true,
    0
  ),
  (
    '08b07156-ef06-45ba-8fcc-41c2372162dc',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'info_text',
    'Telefon',
    '+48 123 456 789',
    'tel:+48123456789',
    'Phone',
    1,
    true,
    0
  ),
  (
    '08b07156-ef06-45ba-8fcc-41c2372162dc',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'info_text',
    'Lokalizacja',
    'Polska',
    null,
    'MapPin',
    2,
    true,
    0
  ),
  (
    '08b07156-ef06-45ba-8fcc-41c2372162dc',
    '8f3009d3-3167-423f-8382-3eab1dce8cb1',
    'info_text',
    'Osoba do kontaktu',
    'Sebastian Snopek',
    null,
    'User',
    3,
    true,
    0
  );

-- Aktualizacja stylów sekcji dla odpowiedniego wyglądu
UPDATE cms_sections SET
  background_color = '#f9fafb',
  text_color = '#000000',
  padding = 48,
  alignment = 'center',
  display_type = 'grid',
  style_class = 'grid-cols-1 md:grid-cols-3 gap-12',
  gap = 48,
  section_margin_top = 48,
  section_margin_bottom = 48
WHERE id = '146c88fb-dc9d-4e6c-9b08-df54895cc000';

UPDATE cms_sections SET
  background_color = '#ffffff',
  text_color = '#000000',
  padding = 80,
  alignment = 'center',
  display_type = 'block',
  section_margin_top = 80,
  section_margin_bottom = 80
WHERE id = '9a04ff91-d5b4-4881-92ef-020538be0258';

UPDATE cms_sections SET
  background_color = '#f9fafb',
  text_color = '#000000',
  padding = 80,
  alignment = 'center',
  display_type = 'grid',
  style_class = 'grid-cols-1 md:grid-cols-3 gap-12',
  gap = 48,
  section_margin_top = 80,
  section_margin_bottom = 80
WHERE id = '08b07156-ef06-45ba-8fcc-41c2372162dc';