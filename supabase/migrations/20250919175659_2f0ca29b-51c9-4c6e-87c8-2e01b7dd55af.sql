-- Usuwanie przykładowych danych
DELETE FROM cms_items;

-- Dodanie rzeczywistych danych z referencji Pure Life
INSERT INTO cms_items (section_id, type, title, description, url, position) 
SELECT 
  s.id,
  'button',
  item_data.title,
  item_data.description,
  item_data.url,
  item_data.position
FROM cms_sections s
CROSS JOIN (
  VALUES 
    -- Strefa współpracy
    ('Strefa współpracy', 'PARTNER', 'Panel nadrzędny gotowe materiały, które możesz już dziś wysłać klientom oraz osobiom zainteresowanym produktami.', '#partner', 1),
    ('Strefa współpracy', 'Szansa biznesowa - pogląd', 'Jeśli chcesz wysłać krótką prezentację produktowo-biznesową', '#szansa-biznesowa', 2),
    ('Strefa współpracy', 'Pierwsze kroki - pogląd', 'Jeśli chcesz wysłać pierwsze kroki', '#pierwsze-kroki', 3),
    ('Strefa współpracy', 'SPECJALISTA', 'Panel nadrzędny gotowe materiały, które możesz już dziś wysłać klientom oraz osobom zainteresowanym', '#specjalista', 4),
    ('Strefa współpracy', 'Możliwość współpracy', 'Jeśli chcesz wysłać krótką prezentację produktowo-biznesową', '#mozliwosc-wspolpracy', 5),
    
    -- Klient  
    ('Klient', 'OMEGA-3 - informacje', 'Jeśli chcesz wysłać krótką prezentację zdrowotno-produktową', '#omega3-info', 1),
    ('Klient', 'Niezbędnik klienta', 'Jeśli chcesz wysłać "Niezbędnik klienta" nowemu klientowi', '#niezbednik-klienta', 2),
    
    -- Terminarz
    ('Terminarz', 'Terminarz Pure Life', 'Wyłącznie dla partnerów i specjalistów', '#terminarz', 1),
    
    -- Social Media
    ('Social Media', 'WhatsApp', 'Dostęp do społeczności', '#whatsapp', 1),
    ('Social Media', 'Grupy na Facebooku', 'Dostęp do grup na facebooku wyłącznie dla partnerów i specjalistów', '#fb-grupy', 2),
    ('Social Media', 'Twoja omega 3 (Pure Life)', 'Kliknij tu i podlącz pryzmat i wejdź do wiadomości', '#omega3-pure-life', 3),
    
    -- Materiały - social media
    ('Materiały - social media', 'SOCIAL MEDIA - materiały', 'Materiały dla social media', '#social-materialy', 1),
    
    -- Aplikacje
    ('Aplikacje', 'EQapp', 'Aplikacja optymalizuje wszystkie procesy związane z biznesem', '#eqapp', 1),
    ('Aplikacje', 'Eqology PRO', 'Aplikacja eqology będąca najlepszym narzędziem wspierającym twój biznes', '#eqology-pro', 2),
    ('Aplikacje', 'Pobierz - Sklep Play', 'Pobierz ze sklepu Play', 'https://play.google.com', 3),
    ('Aplikacje', 'Pobierz - AppStore', 'Pobierz z AppStore', 'https://apps.apple.com', 4),
    
    -- Materiały na zamówienie
    ('Materiały na zamówienie', 'E-book (spersonalizowany)', 'Książka ze spersonalizowaną okładką i wieloma przydatnymi informacjami', '#ebook', 1),
    ('Materiały na zamówienie', 'Katalog - ulotki', 'Katalog wspierający proces organizacji spotkań i prezentacji', '#katalog', 2),
    
    -- EQ GO
    ('EQ GO', 'EQ GO', 'Formularz kontaktowy', '#eq-go', 1),
    
    -- Lista zadań
    ('Lista zadań', 'Pobierz', 'Lista zadań do wykonania', '#lista-zadan', 1),
    
    -- POMOC
    ('POMOC', 'SUPPORT', 'Wsparcie techniczne', '#support', 1),
    ('POMOC', 'KONTAKT', 'Dane kontaktowe i informacje', '#kontakt', 2),
    ('POMOC', 'ZADZWOŃ - kliknij', 'Bezpośredni kontakt telefoniczny', 'tel:+48123456789', 3),
    ('POMOC', 'NAPISZ - kliknij', 'Wyślij wiadomość', 'mailto:kontakt@purelife.pl', 4),
    ('POMOC', 'Wsparcie - Zespół Pure Life', 'Potrzebujesz wsparcia? Zespół Pure Life służy pomocą', '#wsparcie-zespol', 5)
) AS item_data(section_title, title, description, url, position)
WHERE s.title = item_data.section_title;