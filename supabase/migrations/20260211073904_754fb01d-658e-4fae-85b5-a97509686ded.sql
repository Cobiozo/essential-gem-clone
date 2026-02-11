DO $$
DECLARE
  v_page_id UUID;
  v_section_1 UUID;
  v_section_2 UUID;
  v_section_3 UUID;
  v_section_4a UUID;
  v_section_4b UUID;
  v_section_5 UUID;
  v_section_6 UUID;
  v_section_7 UUID;
  v_section_8 UUID;
BEGIN

INSERT INTO public.pages (title, slug, is_published, is_active, position, visible_to_everyone)
VALUES ('Katalog Elementów', 'katalog-elementow', true, true, 99, true)
RETURNING id INTO v_page_id;

-- SEKCJA 1: Hero
INSERT INTO public.cms_sections (page_id, title, position, is_active, section_type, visible_to_everyone, style_class)
VALUES (v_page_id, 'Hero / Baner', 0, true, 'row', true, 'columns-1')
RETURNING id INTO v_section_1;

INSERT INTO public.cms_items (page_id, section_id, type, title, position, is_active, column_index, visible_to_everyone, cells)
VALUES
(v_page_id, v_section_1, 'image', 'Baner główny', 0, true, 0, true, '[{"type":"img","content":"","alt":"Baner główny - miejsce na grafikę"}]'::jsonb),
(v_page_id, v_section_1, 'heading', 'Nagłówek Hero', 1, true, 0, true, '[{"type":"h1","content":"ZMIENIAMY ZDROWIE I ŻYCIE LUDZI NA LEPSZE","level":1}]'::jsonb),
(v_page_id, v_section_1, 'text', 'Podpis Hero', 2, true, 0, true, '[{"type":"paragraph","content":"Eqology Independent Business Partner | Pure Life"}]'::jsonb);

-- SEKCJA 2: Treść tekstowa
INSERT INTO public.cms_sections (page_id, title, position, is_active, section_type, visible_to_everyone, style_class)
VALUES (v_page_id, 'Treść tekstowa', 1, true, 'row', true, 'columns-1')
RETURNING id INTO v_section_2;

INSERT INTO public.cms_items (page_id, section_id, type, title, position, is_active, column_index, visible_to_everyone, cells)
VALUES
(v_page_id, v_section_2, 'heading', 'Nagłówek sekcji', 0, true, 0, true, '[{"type":"h2","content":"Witaj w swojej podróży po zdrowie!","level":2}]'::jsonb),
(v_page_id, v_section_2, 'text', 'Akapit 1', 1, true, 0, true, '[{"type":"paragraph","content":"Cieszymy się, że tu jesteś! Naszą misją jest pomaganie ludziom w prowadzeniu zdrowszego i bardziej świadomego życia. Wierzymy, że każdy zasługuje na dostęp do najwyższej jakości produktów wspierających zdrowie."}]'::jsonb),
(v_page_id, v_section_2, 'text', 'Akapit 2', 2, true, 0, true, '[{"type":"paragraph","content":"Nasze produkty oparte są na norweskiej tradycji czystości i jakości. Omega-3 pochodząca z dziko żyjących ryb arktycznych, naturalne składniki i innowacyjne formuły — to fundamenty naszej oferty."}]'::jsonb),
(v_page_id, v_section_2, 'text', 'Akapit 3', 3, true, 0, true, '[{"type":"paragraph","content":"Dołącz do tysięcy osób, które już zmieniły swoje nawyki zdrowotne na lepsze. Razem możemy więcej!"}]'::jsonb);

-- SEKCJA 3: Wideo + opis
INSERT INTO public.cms_sections (page_id, title, position, is_active, section_type, visible_to_everyone, style_class)
VALUES (v_page_id, 'Wideo + opis', 2, true, 'row', true, 'columns-1')
RETURNING id INTO v_section_3;

INSERT INTO public.cms_items (page_id, section_id, type, title, position, is_active, column_index, visible_to_everyone, cells)
VALUES
(v_page_id, v_section_3, 'heading', 'Nagłówek wideo', 0, true, 0, true, '[{"type":"h2","content":"Dlaczego omega-3?","level":2}]'::jsonb),
(v_page_id, v_section_3, 'video', 'Film omega-3', 1, true, 0, true, '[{"type":"video_embed","content":"","title":"Film o omega-3 — wstaw link do wideo"}]'::jsonb),
(v_page_id, v_section_3, 'text', 'Opis pod wideo', 2, true, 0, true, '[{"type":"paragraph","content":"Kwasy tłuszczowe omega-3 są niezbędne dla prawidłowego funkcjonowania organizmu. Wspierają układ sercowo-naczyniowy, mózg, oczy i stawy. Nasz organizm nie potrafi ich sam wytworzyć — musimy dostarczać je z pożywieniem lub suplementacją."}]'::jsonb),
(v_page_id, v_section_3, 'video', 'Film Karolina Kowalczyk', 3, true, 0, true, '[{"type":"video_embed","content":"","title":"Karolina Kowalczyk — wstaw link do wideo"}]'::jsonb);

-- SEKCJA 4a: Collapsible - Zamówienie
INSERT INTO public.cms_sections (page_id, title, position, is_active, section_type, visible_to_everyone, style_class, collapsible_header, default_expanded, show_title)
VALUES (v_page_id, 'Zamówienie', 3, true, 'row', true, 'collapsible-section columns-1', 'Zamówienie', false, true)
RETURNING id INTO v_section_4a;

INSERT INTO public.cms_items (page_id, section_id, type, title, position, is_active, column_index, visible_to_everyone, cells)
VALUES
(v_page_id, v_section_4a, 'text', 'Treść zamówienia', 0, true, 0, true, '[{"type":"paragraph","content":"Aby złożyć zamówienie, kliknij przycisk poniżej i postępuj zgodnie z instrukcjami. Pamiętaj, że pierwsze zamówienie wymaga rejestracji konta."}]'::jsonb),
(v_page_id, v_section_4a, 'button', 'Przycisk zamówienia', 1, true, 0, true, '[{"type":"btn","content":"Złóż zamówienie","url":"#"}]'::jsonb);

-- SEKCJA 4b: Collapsible - Kontakt
INSERT INTO public.cms_sections (page_id, title, position, is_active, section_type, visible_to_everyone, style_class, collapsible_header, default_expanded, show_title)
VALUES (v_page_id, 'Bądź z nami w kontakcie!', 4, true, 'row', true, 'collapsible-section columns-1', 'Bądź z nami w kontakcie!', false, true)
RETURNING id INTO v_section_4b;

INSERT INTO public.cms_items (page_id, section_id, type, title, position, is_active, column_index, visible_to_everyone, cells)
VALUES
(v_page_id, v_section_4b, 'text', 'Treść kontakt', 0, true, 0, true, '[{"type":"paragraph","content":"Śledź nas w mediach społecznościowych, aby być na bieżąco z nowościami i inspiracjami zdrowotnymi."}]'::jsonb),
(v_page_id, v_section_4b, 'social-icons', 'Ikony kontakt', 1, true, 0, true, '[{"type":"social-icons","icons":[{"platform":"Facebook","url":"https://facebook.com"},{"platform":"Instagram","url":"https://instagram.com"},{"platform":"LinkedIn","url":"https://linkedin.com"}],"size":24}]'::jsonb);

-- SEKCJA 5: Elementy interaktywne
INSERT INTO public.cms_sections (page_id, title, position, is_active, section_type, visible_to_everyone, style_class)
VALUES (v_page_id, 'Elementy interaktywne', 5, true, 'row', true, 'columns-1')
RETURNING id INTO v_section_5;

INSERT INTO public.cms_items (page_id, section_id, type, title, position, is_active, column_index, visible_to_everyone, cells)
VALUES
(v_page_id, v_section_5, 'button', 'CTA Zamów', 0, true, 0, true, '[{"type":"btn","content":"Zamów teraz","url":"#"}]'::jsonb),
(v_page_id, v_section_5, 'copy-to-clipboard', 'Kopiuj link', 1, true, 0, true, '[{"type":"copy-to-clipboard","content":"https://purelife.lovable.app","buttonText":"Kopiuj link"}]'::jsonb),
(v_page_id, v_section_5, 'file-download', 'Pobieranie pliku', 2, true, 0, true, '[{"type":"file-download","content":"Pobierz katalog produktów","url":""}]'::jsonb),
(v_page_id, v_section_5, 'social-icons', 'Ikony społecznościowe', 3, true, 0, true, '[{"type":"social-icons","icons":[{"platform":"Facebook","url":"https://facebook.com"},{"platform":"Instagram","url":"https://instagram.com"},{"platform":"LinkedIn","url":"https://linkedin.com"}],"size":32}]'::jsonb);

-- SEKCJA 6: Elementy wizualne
INSERT INTO public.cms_sections (page_id, title, position, is_active, section_type, visible_to_everyone, style_class)
VALUES (v_page_id, 'Elementy wizualne', 6, true, 'row', true, 'columns-1')
RETURNING id INTO v_section_6;

INSERT INTO public.cms_items (page_id, section_id, type, title, position, is_active, column_index, visible_to_everyone, cells)
VALUES
(v_page_id, v_section_6, 'gallery', 'Galeria demo', 0, true, 0, true, '[{"type":"gallery","images":[],"columns":4}]'::jsonb),
(v_page_id, v_section_6, 'carousel', 'Karuzela demo', 1, true, 0, true, '[{"type":"carousel","images":[],"autoplay":true,"interval":3000}]'::jsonb),
(v_page_id, v_section_6, 'info_text', 'Ikona z tekstem', 2, true, 0, true, '[{"type":"info_text","content":"To jest przykładowy tekst informacyjny z ikoną."}]'::jsonb),
(v_page_id, v_section_6, 'divider', 'Separator', 3, true, 0, true, '[{"type":"hr"}]'::jsonb),
(v_page_id, v_section_6, 'spacer', 'Odstęp', 4, true, 0, true, '[{"type":"space","height":40}]'::jsonb);

-- SEKCJA 7: Elementy zaawansowane
INSERT INTO public.cms_sections (page_id, title, position, is_active, section_type, visible_to_everyone, style_class)
VALUES (v_page_id, 'Elementy zaawansowane', 7, true, 'row', true, 'columns-1')
RETURNING id INTO v_section_7;

INSERT INTO public.cms_items (page_id, section_id, type, title, position, is_active, column_index, visible_to_everyone, cells)
VALUES
(v_page_id, v_section_7, 'counter', 'Licznik klientów', 0, true, 0, true, '[{"type":"counter","start":0,"end":500,"duration":2000,"suffix":"+","prefix":""}]'::jsonb),
(v_page_id, v_section_7, 'heading', 'Opis licznika', 1, true, 0, true, '[{"type":"h3","content":"zadowolonych klientów","level":3}]'::jsonb),
(v_page_id, v_section_7, 'progress-bar', 'Pasek postępu', 2, true, 0, true, '[{"type":"progress-bar","value":75,"max":100,"label":"Satysfakcja klientów","showValue":true}]'::jsonb),
(v_page_id, v_section_7, 'rating', 'Ocena', 3, true, 0, true, '[{"type":"rating","value":5,"max":5,"label":"Ocena produktów"}]'::jsonb),
(v_page_id, v_section_7, 'testimonial', 'Referencja', 4, true, 0, true, '[{"type":"testimonial","content":"Odkąd stosuję produkty Eqology, czuję się zdrowsza i pełna energii. Polecam każdemu!","author":"Anna Kowalska","role":"Klientka","avatar":""}]'::jsonb),
(v_page_id, v_section_7, 'alert', 'Alert informacyjny', 5, true, 0, true, '[{"type":"alert","content":"Pamiętaj o regularnym stosowaniu omega-3 dla najlepszych efektów zdrowotnych!","variant":"info","title":"Porada zdrowotna"}]'::jsonb);

-- SEKCJA 8: Stopka
INSERT INTO public.cms_sections (page_id, title, position, is_active, section_type, visible_to_everyone, style_class)
VALUES (v_page_id, 'Stopka', 8, true, 'row', true, 'columns-1')
RETURNING id INTO v_section_8;

INSERT INTO public.cms_items (page_id, section_id, type, title, position, is_active, column_index, visible_to_everyone, cells)
VALUES
(v_page_id, v_section_8, 'image', 'Logo Pure Life', 0, true, 0, true, '[{"type":"img","content":"","alt":"Logo Pure Life"}]'::jsonb),
(v_page_id, v_section_8, 'text', 'Pozdrowienia', 1, true, 0, true, '[{"type":"paragraph","content":"Pozdrawiamy serdecznie,\nZespół Pure Life"}]'::jsonb);

END $$;