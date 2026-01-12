-- Add more teamContacts translation keys
INSERT INTO public.i18n_translations (language_code, namespace, key, value) VALUES
-- Approval status
('pl', 'teamContacts', 'approvalStatus.active', 'Aktywny'),
('pl', 'teamContacts', 'approvalStatus.awaitingAdmin', 'Oczekuje na zatwierdzenie przez administratora'),
('pl', 'teamContacts', 'approvalStatus.awaitingGuardian', 'Oczekuje na zatwierdzenie przez opiekuna'),
('pl', 'teamContacts', 'approvalStatus.inactive', 'Nieaktywny'),
-- Contact details
('pl', 'teamContacts', 'contactInfo', 'Kontakt'),
('pl', 'teamContacts', 'phone', 'Tel'),
('pl', 'teamContacts', 'email', 'Email'),
('pl', 'teamContacts', 'profession', 'Zawód'),
('pl', 'teamContacts', 'structure', 'Struktura'),
('pl', 'teamContacts', 'upline', 'Upline'),
('pl', 'teamContacts', 'startDate', 'Start współpracy'),
('pl', 'teamContacts', 'level', 'Poziom'),
('pl', 'teamContacts', 'products', 'Produkty'),
('pl', 'teamContacts', 'purchased', 'Zakupiony'),
('pl', 'teamContacts', 'purchaseDate', 'Data zakupu'),
('pl', 'teamContacts', 'reminders', 'Przypomnienia'),
('pl', 'teamContacts', 'nextContact', 'Następny kontakt'),
('pl', 'teamContacts', 'reminder', 'Przypomnienie'),
('pl', 'teamContacts', 'accountStatus', 'Status konta'),
('pl', 'teamContacts', 'addNotesPlaceholder', 'Dodaj notatki o członku zespołu...'),
-- Common keys
('pl', 'common', 'history', 'Historia'),
('pl', 'common', 'edit', 'Edytuj'),
('pl', 'common', 'delete', 'Usuń'),
('pl', 'common', 'cancel', 'Anuluj'),
('pl', 'common', 'save', 'Zapisz'),
('pl', 'common', 'add', 'Dodaj'),
('pl', 'common', 'preview', 'Podgląd'),
('pl', 'common', 'download', 'Pobierz'),
('pl', 'common', 'copy', 'Kopiuj'),
('pl', 'common', 'share', 'Udostępnij'),
('pl', 'common', 'success', 'Sukces'),
('pl', 'common', 'error', 'Błąd')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();