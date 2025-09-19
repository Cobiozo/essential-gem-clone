-- Wstawianie przykładowych elementów CMS zgodnie z referencjami
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
    ('Strefa współpracy', 'Slack', 'Komunikator zespołowy Pure Life', 'https://slack.com', 1),
    ('Strefa współpracy', 'Teams', 'Microsoft Teams', 'https://teams.microsoft.com', 2),
    ('Strefa współpracy', 'Zoom', 'Videokonferencje', 'https://zoom.us', 3),
    ('Strefa współpracy', 'Dysk Google', 'Współdzielone pliki', 'https://drive.google.com', 4),
    
    ('Klient', 'CRM System', 'System zarządzania klientami', 'https://crm.purelife.pl', 1),
    ('Klient', 'Baza kontaktów', 'Lista klientów', '#contacts', 2),
    ('Klient', 'Historia zamówień', 'Przegląd zamówień', '#orders', 3),
    ('Klient', 'Faktury', 'Dokumenty finansowe', '#invoices', 4),
    
    ('Terminarz', 'Kalendarz Google', 'Kalendarz zespołu', 'https://calendar.google.com', 1),
    ('Terminarz', 'Outlook', 'Kalendarz Outlook', 'https://outlook.live.com/calendar', 2),
    ('Terminarz', 'Spotkania', 'Planowanie spotkań', '#meetings', 3),
    ('Terminarz', 'Wydarzenia', 'Wydarzenia firmowe', '#events', 4),
    
    ('Social Media', 'Facebook', 'Fanpage Pure Life', 'https://facebook.com/purelife', 1),
    ('Social Media', 'Instagram', 'Profil Instagram', 'https://instagram.com/purelife', 2),
    ('Social Media', 'LinkedIn', 'Profil firmowy', 'https://linkedin.com/company/purelife', 3),
    ('Social Media', 'YouTube', 'Kanał YouTube', 'https://youtube.com/purelife', 4),
    
    ('Materiały - social media', 'Grafiki', 'Szablony graficzne', '#graphics', 1),
    ('Materiały - social media', 'Wideo', 'Materiały wideo', '#videos', 2),
    ('Materiały - social media', 'Teksty', 'Gotowe treści', '#content', 3),
    ('Materiały - social media', 'Hashtagi', 'Lista hashtagów', '#hashtags', 4),
    
    ('Aplikacje', 'Pure Life App', 'Aplikacja mobilna', 'https://app.purelife.pl', 1),
    ('Aplikacje', 'Web Portal', 'Portal internetowy', 'https://portal.purelife.pl', 2),
    ('Aplikacje', 'Admin Panel', 'Panel administracyjny', '/admin', 3),
    ('Aplikacje', 'Analytics', 'Statystyki', '#analytics', 4),
    
    ('Materiały na zamówienie', 'Katalogi', 'Katalogi produktów', '#catalogs', 1),
    ('Materiały na zamówienie', 'Broszury', 'Materiały promocyjne', '#brochures', 2),
    ('Materiały na zamówienie', 'Ulotki', 'Materiały informacyjne', '#flyers', 3),
    ('Materiały na zamówienie', 'Banery', 'Materiały reklamowe', '#banners', 4),
    
    ('EQ GO', 'Aplikacja EQ GO', 'Główna aplikacja', 'https://eqgo.purelife.pl', 1),
    ('EQ GO', 'Dashboard', 'Panel kontrolny', '#dashboard', 2),
    ('EQ GO', 'Raporty', 'Raporty i analizy', '#reports', 3),
    ('EQ GO', 'Ustawienia', 'Konfiguracja systemu', '#settings', 4),
    
    ('Lista zadań', 'Zadania bieżące', 'Aktualne zadania', '#current-tasks', 1),
    ('Lista zadań', 'Kalendarz zadań', 'Planowanie zadań', '#task-calendar', 2),
    ('Lista zadań', 'Projekty', 'Zarządzanie projektami', '#projects', 3),
    ('Lista zadań', 'Raporty', 'Raporty postępu', '#task-reports', 4),
    
    ('POMOC', 'Dokumentacja', 'Podręcznik użytkownika', '#documentation', 1),
    ('POMOC', 'FAQ', 'Najczęściej zadawane pytania', '#faq', 2),
    ('POMOC', 'Kontakt', 'Skontaktuj się z nami', '#contact', 3),
    ('POMOC', 'Wsparcie techniczne', 'Pomoc techniczna', '#support', 4)
) AS item_data(section_title, title, description, url, position)
WHERE s.title = item_data.section_title;