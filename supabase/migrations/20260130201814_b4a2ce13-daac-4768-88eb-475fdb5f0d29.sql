-- Seed: LinkedIn w Firmie - Przykładowe Wydarzenie

DO $$
DECLARE
  event_uuid UUID;
BEGIN
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
  ) RETURNING id INTO event_uuid;

  -- 2. Sekcje treści CMS
  INSERT INTO paid_event_content_sections (event_id, section_type, title, content, position, is_active, icon_name) VALUES
  (event_uuid, 'about', 'O szkoleniu', '<p>Kompleksowe szkolenie dotyczące wykorzystywania LinkedIn w rozmaitych zastosowaniach związanych z marketingiem, budowaniem wizerunku, analizą konkurencji i poszukiwaniem kandydatów na pracowników. Podczas szkolenia omawiane jest zarówno wykorzystywanie kont prywatnych, jak i firmowych - pod kątem zastosowania w dowolnych branżach Uczestników.</p>', 1, true, 'BookOpen'),
  (event_uuid, 'why_join', 'Dlaczego warto wziąć udział?', '<p>Twój profil na LinkedIn to nie wirtualne CV – to Twoja całodobowa wizytówka. Podczas tego szkolenia nauczysz się, jak budować autorytet, angażować odbiorców, znajdować odpowiednich pracowników i pozyskiwać klientów bez nachalności!</p>', 2, true, 'Target'),
  (event_uuid, 'for_whom', 'Kto powinien wziąć udział?', '<p>Szkolenie dla pracowników firm (marketing, HR, handlowcy) i przedsiębiorców, którzy chcą wykorzystywać LinkedIn do budowania wiarygodności, relacji oraz realnych efektów biznesowych (sprzedaż, rekrutacja, współpraca).</p>', 3, true, 'Users'),
  (event_uuid, 'duration', 'Czas trwania', '<p>Szkolenie trwa 1 dzień w godzinach 9:00-15:30. Przewidziane są przerwy kawowe oraz przerwa obiadowa.</p>', 5, true, 'Clock');

  -- Sekcja programu z items JSONB
  INSERT INTO paid_event_content_sections (event_id, section_type, title, content, position, is_active, icon_name, items) VALUES
  (event_uuid, 'schedule', 'Program szkolenia', NULL, 4, true, 'Calendar', '[
    {"text": "LinkedIn jako narzędzie rozwoju kariery i biznesu", "icon": "Briefcase"},
    {"text": "LinkedIn 2025/2026 – kim są użytkownicy?"},
    {"text": "Jak zmienił się LinkedIn: od CV do platformy wpływu, zaufania i sprzedaży społecznościowej"},
    {"text": "LinkedIn vs. Facebook – podobieństwa i różnice"},
    {"text": "Kto może szczególnie skorzystać dzięki obecności w LinkedIn?"},
    {"text": "Profil, który sprzedaje kompetencje i buduje zaufanie", "icon": "User"},
    {"text": "Profil personalny – nie jako CV, ale oferta wartości z dowodami"},
    {"text": "Najważniejsze sekcje profilu i ich znaczenie dla odbiorców"},
    {"text": "Kręgi kontaktów i Social Selling Index"},
    {"text": "Ustawienia prywatności"},
    {"text": "Strona firmowa, która wspiera sprzedaż i rekrutację", "icon": "Building"},
    {"text": "Jak założyć i prowadzić stronę firmową"},
    {"text": "Budowanie zasięgów organicznych"},
    {"text": "Showcase Pages i grupy"}
  ]'::jsonb);

  -- 3. Pakiety biletów
  INSERT INTO paid_event_tickets (event_id, name, description, price_pln, quantity_available, quantity_sold, is_active, position, is_featured, highlight_text, benefits) VALUES
  (event_uuid, 'Przedpłata', 'Cena promocyjna przy wcześniejszej rejestracji', 64800, 25, 0, true, 1, true, 'Oszczędź 10% przy wcześniejszej rejestracji', '["zniżkę 10% przy zgłoszeniu (cena standardowa 720 zł)", "udział w zajęciach online na żywo", "materiały szkoleniowe w wersji elektronicznej", "certyfikat uczestnictwa", "bezpłatne anulowanie zgłoszenia do 3 dni przed terminem"]'::jsonb),
  (event_uuid, 'Cena standardowa', 'Pełna cena uczestnictwa', 72000, 10, 0, true, 2, false, NULL, '["udział w zajęciach online na żywo", "materiały szkoleniowe w wersji elektronicznej", "certyfikat uczestnictwa", "bezpłatne anulowanie zgłoszenia do 3 dni przed terminem"]'::jsonb);

  -- 4. Prelegent
  INSERT INTO paid_event_speakers (event_id, name, title, bio, photo_url, position) VALUES
  (event_uuid, 'Marcin Pietraszek', 'Empemedia', 'Trener social media, konsultant; od kilkunastu lat usługowo zajmuje się marketingiem i mediami społecznościowymi, w tym platformą LinkedIn. Obecnie dzieli się swoją wiedzą poprzez szkolenia i konsultacje. Jest autorem wielu publikacji na temat biznesu i marketingu, w tym książki "PRo-MOC-ja". Prowadził szkolenia dla firm z różnych branż, pomagając im skutecznie wykorzystywać LinkedIn do budowania marki osobistej i pozyskiwania klientów.', NULL, 1);

END $$;