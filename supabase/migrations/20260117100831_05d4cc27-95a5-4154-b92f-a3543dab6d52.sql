-- Add translations for EventsManagement and CookieConsentManagement components
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
-- admin.events namespace
('pl', 'admin.events', 'title', 'Zarządzanie Wydarzeniami'),
('pl', 'admin.events', 'adminPanel', 'Panel administratora'),
('pl', 'admin.events', 'addWebinar', 'Dodaj Webinar'),
('pl', 'admin.events', 'addTeamMeeting', 'Dodaj spotkanie zespołu'),
('pl', 'admin.events', 'webinars', 'Webinary'),
('pl', 'admin.events', 'teamMeeting', 'Spotkanie zespołu'),
('pl', 'admin.events', 'individualMeeting', 'Spotkanie indywidualne'),
('pl', 'admin.events', 'smsLogs', 'Logi SMS'),
('pl', 'admin.events', 'topics', 'Tematy'),
('pl', 'admin.events', 'leaders', 'Liderzy'),
('pl', 'admin.events', 'settings', 'Ustawienia'),
('pl', 'admin.events', 'smsLogsTitle', 'Logi przypomnień SMS'),
('pl', 'admin.events', 'smsLogsDescription', 'Historia wysłanych przypomnień SMS dla webinarów'),
('pl', 'admin.events', 'noSmsLogs', 'Brak logów SMS. Przypomnienia zostaną zapisane po włączeniu funkcji SMS.'),
('pl', 'admin.events', 'webinarDeleted', 'Webinar został usunięty'),
('pl', 'admin.events', 'teamTrainingDeleted', 'Spotkanie zespołu zostało usunięte'),
-- admin.cookies namespace
('pl', 'admin.cookies', 'loadFailed', 'Nie udało się załadować ustawień'),
('pl', 'admin.cookies', 'saved', 'Ustawienia zostały zapisane'),
('pl', 'admin.cookies', 'saveFailed', 'Nie udało się zapisać ustawień'),
('pl', 'admin.cookies', 'categorySaved', 'Kategoria została zapisana'),
('pl', 'admin.cookies', 'categorySaveFailed', 'Nie udało się zapisać kategorii'),
('pl', 'admin.cookies', 'newCategory', 'Nowa kategoria'),
('pl', 'admin.cookies', 'categoryDescriptionPlaceholder', 'Opis kategorii'),
('pl', 'admin.cookies', 'categoryAdded', 'Nowa kategoria została dodana'),
('pl', 'admin.cookies', 'categoryAddFailed', 'Nie udało się dodać kategorii'),
('pl', 'admin.cookies', 'categoryDeleted', 'Kategoria została usunięta'),
('pl', 'admin.cookies', 'categoryDeleteFailed', 'Nie udało się usunąć kategorii'),
('pl', 'admin.cookies', 'loadError', 'Błąd ładowania ustawień')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;