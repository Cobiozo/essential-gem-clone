-- Insert translation keys for admin.reflinks namespace
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
-- Link types
('pl', 'admin.reflinks', 'typeReflink', 'Reflink (rejestracja)'),
('pl', 'admin.reflinks', 'typeInternal', 'Link wewnętrzny'),
('pl', 'admin.reflinks', 'typeExternal', 'Link zewnętrzny'),
('pl', 'admin.reflinks', 'typeClipboard', 'Kopiuj do schowka'),
('pl', 'admin.reflinks', 'typeInfolink', 'InfoLink (z kodem OTP)'),

-- Success/info messages
('pl', 'admin.reflinks', 'contentCopied', 'Treść została skopiowana do schowka'),

-- Tabs
('pl', 'admin.reflinks', 'globalReflinks', 'Reflinki globalne'),
('pl', 'admin.reflinks', 'userLinks', 'Linki użytkowników'),
('pl', 'admin.reflinks', 'otpCodes', 'Kody OTP'),

-- UI elements
('pl', 'admin.reflinks', 'management', 'Zarządzanie Reflinkami'),
('pl', 'admin.reflinks', 'description', 'Twórz i zarządzaj reflinkami z tytułami, grafikami i kontrolą widoczności'),
('pl', 'admin.reflinks', 'addReflink', 'Dodaj Reflink'),
('pl', 'admin.reflinks', 'addNewReflink', 'Dodaj nowy reflink'),
('pl', 'admin.reflinks', 'addNewDescription', 'Utwórz nowy reflink z tytułem, grafiką i ustawieniami widoczności'),
('pl', 'admin.reflinks', 'editReflink', 'Edytuj reflink'),
('pl', 'admin.reflinks', 'editDescription', 'Zmień ustawienia reflinka. Zapisz zmiany przyciskiem "Zapisz".'),
('pl', 'admin.reflinks', 'buttonVisibility', 'Widoczność przycisku "Reflinki" dla ról'),
('pl', 'admin.reflinks', 'buttonVisibilityHint', 'Użytkownik zobaczy przycisk "Reflinki" tylko gdy włączysz go dla jego roli.'),
('pl', 'admin.reflinks', 'noReflinks', 'Brak reflinków. Kliknij "Dodaj Reflink" aby utworzyć pierwszy.'),
('pl', 'admin.reflinks', 'visibleTo', 'Widoczny dla'),

-- Role translations
('pl', 'roles', 'client', 'Klient'),
('pl', 'roles', 'partner', 'Partner'),
('pl', 'roles', 'specialist', 'Specjalista'),
('pl', 'roles', 'admin', 'Administrator'),

-- Common translations
('pl', 'common', 'active', 'Aktywny'),
('pl', 'toast', 'copied', 'Skopiowano!')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;