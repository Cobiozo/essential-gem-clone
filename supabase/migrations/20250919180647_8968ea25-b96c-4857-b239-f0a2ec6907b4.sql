-- Rozszerzenie systemu CMS o różne typy treści
-- Dodanie nowych typów elementów
INSERT INTO cms_items (section_id, type, title, description, url, position) 
VALUES 
  -- Header - edytowalne teksty główne
  ((SELECT id FROM cms_sections WHERE title = 'Strefa współpracy' ORDER BY position LIMIT 1), 'header_text', 'Tekst powitalny', 'Witaj w Niezbędniku Pure Life - przestrzeni stworzonej z myślą o Tobie i Twojej codziennej pracy w zespole Pure Life. Tu znajdziesz materiały oraz zasoby, które pomogą Ci być skutecznym profesjonalistą i lekarstwem.', NULL, 0),
  ((SELECT id FROM cms_sections WHERE title = 'Strefa współpracy' ORDER BY position LIMIT 1), 'author', 'Autor', 'Pozostałem - Dawid Kowalczyk', NULL, 0),
  
  -- Dodatkowe informacje w sekcjach
  ((SELECT id FROM cms_sections WHERE title = 'Klient' ORDER BY position LIMIT 1), 'info_text', 'Informacje o sekcji klient', 'W tej sekcji znajdziesz komplet materiałów stworzonych z myślą o: - pozyskiwaniu nowych klientów, - budowaniu relacji i zaufania, - profesjonalnej obsłudze już obecnych klientów.', NULL, 0),
  ((SELECT id FROM cms_sections WHERE title = 'Klient' ORDER BY position LIMIT 1), 'tip', 'Wskazówka', 'Aby zaprosić nową osobę, kliknij przycisk „udostępnij" i podziel się materiałami.', NULL, 10),
  
  ((SELECT id FROM cms_sections WHERE title = 'Social Media' ORDER BY position LIMIT 1), 'description', 'Opis WhatsApp', 'Po dołączeniu wybierz odpowiednie czaty: • PARTNER - jeśli jesteś partnerem biznesowym bądź zespół • SPECJALISTA - jeśli jesteś dieteto/kiem, kosmetolog/iem, fryzjer/em, dermatolożek i korzystasz z systemu zdrowotnego Pure Life • jeśli jesteś specjalistą i chcesz rozwijać biznes i osiąść dobrą fryzjer/em = zrobią też produkt', NULL, 1),
  
  ((SELECT id FROM cms_sections WHERE title = 'POMOC' ORDER BY position LIMIT 1), 'contact_info', 'Informacje kontaktowe', 'Jesteśmy dostępni w dni robocze, w godzinach od 8 do 16. Zapisy czeskiego dzień biznesowy – na przykład konto tymczasowe, jak przebiegała Weekenda. Zastaniamiy się nad pracowaniem także w zabierałem. Reagujemy na sprawa w odpowiedzi na godzinach 24/24.', NULL, 0),
  ((SELECT id FROM cms_sections WHERE title = 'POMOC' ORDER BY position LIMIT 1), 'support_info', 'Informacje o wsparciu', 'Potrzebujesz wsparcia? Możż pytanie, sugestię, uwagi lub Żungi G chuj lub o przegrana: Napisz do nas: wsparcia@purelife.pl', NULL, 6);