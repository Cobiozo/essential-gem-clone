-- ============================================
-- SEED: LinkedIn w Firmie - Przykładowe Wydarzenie
-- ============================================
-- Uruchom ten skrypt w SQL Editor w Supabase:
-- https://supabase.com/dashboard/project/xzlhssqqbajqhnsmbucf/sql/new
-- ============================================

-- 1. Utwórz główne wydarzenie
INSERT INTO paid_events (
  slug,
  title,
  short_description,
  description,
  event_date,
  event_end_date,
  location,
  is_online,
  max_tickets,
  tickets_sold,
  is_published,
  is_active,
  visible_to_everyone,
  visible_to_partners,
  visible_to_clients,
  visible_to_specjalista
) VALUES (
  'linkedin-w-firmie',
  'LinkedIn w Firmie - kompleksowe szkolenie dla pracowników i przedsiębiorców',
  'Naucz się wykorzystywać LinkedIn do budowania wiarygodności, relacji oraz realnych efektów biznesowych.',
  '<p>Kompleksowe szkolenie dotyczące wykorzystywania LinkedIn w rozmaitych zastosowaniach związanych z marketingiem, budowaniem wizerunku, analizą konkurencji i poszukiwaniem kandydatów na pracowników. Podczas szkolenia omawiane jest zarówno wykorzystywanie kont prywatnych, jak i firmowych - pod kątem zastosowania w dowolnych branżach Uczestników.</p>',
  '2026-02-20 09:00:00+01',
  '2026-02-20 15:30:00+01',
  'Online',
  true,
  30,
  0,
  true,
  true,
  true,
  true,
  true,
  true
) RETURNING id;

-- Pobierz ID wydarzenia (użyj w kolejnych insertach)
-- Dla uproszczenia używamy zmiennej

DO $$
DECLARE
  event_uuid UUID;
BEGIN
  -- Pobierz ID wydarzenia
  SELECT id INTO event_uuid FROM paid_events WHERE slug = 'linkedin-w-firmie';

  -- 2. Utwórz sekcje treści CMS
  
  -- Sekcja 1: O szkoleniu
  INSERT INTO paid_event_content_sections (
    event_id, section_type, title, content, position, is_active, icon_name
  ) VALUES (
    event_uuid,
    'about',
    'O szkoleniu',
    '<p>Kompleksowe szkolenie dotyczące wykorzystywania LinkedIn w rozmaitych zastosowaniach związanych z marketingiem, budowaniem wizerunku, analizą konkurencji i poszukiwaniem kandydatów na pracowników. Podczas szkolenia omawiane jest zarówno wykorzystywanie kont prywatnych, jak i firmowych - pod kątem zastosowania w dowolnych branżach Uczestników.</p>',
    1,
    true,
    'BookOpen'
  );

  -- Sekcja 2: Dlaczego warto wziąć udział?
  INSERT INTO paid_event_content_sections (
    event_id, section_type, title, content, position, is_active, icon_name
  ) VALUES (
    event_uuid,
    'why_join',
    'Dlaczego warto wziąć udział?',
    '<p>Twój profil na LinkedIn to nie wirtualne CV – to Twoja całodobowa wizytówka. Podczas tego szkolenia nauczysz się, jak budować autorytet, angażować odbiorców, znajdować odpowiednich pracowników i pozyskiwać klientów bez nachalności!</p>',
    2,
    true,
    'Target'
  );

  -- Sekcja 3: Kto powinien wziąć udział?
  INSERT INTO paid_event_content_sections (
    event_id, section_type, title, content, position, is_active, icon_name
  ) VALUES (
    event_uuid,
    'for_whom',
    'Kto powinien wziąć udział?',
    '<p>Szkolenie dla pracowników firm (marketing, HR, handlowcy) i przedsiębiorców, którzy chcą wykorzystywać LinkedIn do budowania wiarygodności, relacji oraz realnych efektów biznesowych (sprzedaż, rekrutacja, współpraca).</p>',
    3,
    true,
    'Users'
  );

  -- Sekcja 4: Program szkolenia
  INSERT INTO paid_event_content_sections (
    event_id, section_type, title, content, position, is_active, icon_name, items
  ) VALUES (
    event_uuid,
    'schedule',
    'Program szkolenia',
    NULL,
    4,
    true,
    'Calendar',
    '[
      {"text": "LinkedIn jako narzędzie rozwoju kariery i biznesu", "icon": "Briefcase"},
      {"text": "LinkedIn 2025/2026 – kim są użytkownicy?"},
      {"text": "Jak zmienił się LinkedIn: od CV do platformy wpływu, zaufania i sprzedaży społecznościowej (social selling)"},
      {"text": "LinkedIn vs. Facebook – podobieństwa i różnice"},
      {"text": "Kto może szczególnie skorzystać dzięki obecności w LinkedIn?"},
      {"text": "Profil, który sprzedaje kompetencje i buduje zaufanie", "icon": "User"},
      {"text": "Profil personalny – nie jako CV, ale oferta wartości z dowodami"},
      {"text": "Najważniejsze sekcje profilu i ich znaczenie dla odbiorców"},
      {"text": "Kręgi kontaktów i Social Selling Index"},
      {"text": "Ustawienia prywatności"},
      {"text": "Strona firmowa, która wspiera sprzedaż i rekrutację (Company Page)", "icon": "Building"},
      {"text": "Jak założyć i prowadzić stronę firmową"},
      {"text": "Budowanie zasięgów organicznych"},
      {"text": "Showcase Pages i grupy"}
    ]'::jsonb
  );

  -- Sekcja 5: Czas trwania
  INSERT INTO paid_event_content_sections (
    event_id, section_type, title, content, position, is_active, icon_name
  ) VALUES (
    event_uuid,
    'duration',
    'Czas trwania',
    '<p>Szkolenie trwa 1 dzień w godzinach 9:00-15:30. Przewidziane są przerwy kawowe oraz przerwa obiadowa.</p>',
    5,
    true,
    'Clock'
  );

  -- 3. Utwórz pakiety biletów
  
  -- Bilet 1: Przedpłata (wyróżniony)
  INSERT INTO paid_event_tickets (
    event_id, name, description, price_pln, quantity_available, quantity_sold, is_active, position, is_featured, highlight_text, benefits
  ) VALUES (
    event_uuid,
    'Przedpłata',
    'Cena promocyjna przy wcześniejszej rejestracji',
    64800, -- 648 zł w groszach
    25,
    0,
    true,
    1,
    true,
    'Oszczędź 10% przy wcześniejszej rejestracji',
    '[
      "zniżkę 10% przy zgłoszeniu (cena standardowa 720 zł)",
      "udział w zajęciach online na żywo",
      "materiały szkoleniowe w wersji elektronicznej",
      "certyfikat uczestnictwa",
      "bezpłatne anulowanie zgłoszenia do 3 dni przed terminem"
    ]'::jsonb
  );

  -- Bilet 2: Cena standardowa
  INSERT INTO paid_event_tickets (
    event_id, name, description, price_pln, quantity_available, quantity_sold, is_active, position, is_featured, highlight_text, benefits
  ) VALUES (
    event_uuid,
    'Cena standardowa',
    'Pełna cena uczestnictwa',
    72000, -- 720 zł w groszach
    10,
    0,
    true,
    2,
    false,
    NULL,
    '[
      "udział w zajęciach online na żywo",
      "materiały szkoleniowe w wersji elektronicznej",
      "certyfikat uczestnictwa",
      "bezpłatne anulowanie zgłoszenia do 3 dni przed terminem"
    ]'::jsonb
  );

  -- 4. Utwórz prelegenta
  INSERT INTO paid_event_speakers (
    event_id, name, title, bio, photo_url, position
  ) VALUES (
    event_uuid,
    'Marcin Pietraszek',
    'Empemedia',
    'Trener social media, konsultant; od kilkunastu lat usługowo zajmuje się marketingiem i mediami społecznościowymi, w tym platformą LinkedIn. Obecnie dzieli się swoją wiedzą poprzez szkolenia i konsultacje. Jest autorem wielu publikacji na temat biznesu i marketingu, w tym książki "PRo-MOC-ja". Prowadził szkolenia dla firm z różnych branż, pomagając im skutecznie wykorzystywać LinkedIn do budowania marki osobistej i pozyskiwania klientów.',
    NULL,
    1
  );

END $$;

-- Weryfikacja - pokaż utworzone dane
SELECT 'Wydarzenie:' as typ, title, slug FROM paid_events WHERE slug = 'linkedin-w-firmie'
UNION ALL
SELECT 'Sekcje: ' || count(*)::text, '', '' FROM paid_event_content_sections WHERE event_id = (SELECT id FROM paid_events WHERE slug = 'linkedin-w-firmie')
UNION ALL
SELECT 'Bilety: ' || count(*)::text, '', '' FROM paid_event_tickets WHERE event_id = (SELECT id FROM paid_events WHERE slug = 'linkedin-w-firmie')
UNION ALL
SELECT 'Prelegenci: ' || count(*)::text, '', '' FROM paid_event_speakers WHERE event_id = (SELECT id FROM paid_events WHERE slug = 'linkedin-w-firmie');
