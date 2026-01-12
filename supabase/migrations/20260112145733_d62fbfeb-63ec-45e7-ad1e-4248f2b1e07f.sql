-- Add header, nav, and role translation keys
INSERT INTO public.i18n_translations (language_code, namespace, key, value) VALUES
-- Header keys
('pl', 'header', 'noContentToCopy', 'Brak treści do skopiowania'),
('pl', 'header', 'contentCopied', 'Treść została skopiowana do schowka'),
('pl', 'header', 'linkCopied', 'Link został skopiowany do schowka'),
('pl', 'header', 'copyFailed', 'Nie udało się skopiować do schowka'),
-- Nav keys
('pl', 'nav', 'infoLinks', 'InfoLinki'),
('pl', 'nav', 'home', 'Strona główna'),
('pl', 'nav', 'admin', 'Panel CMS'),
('pl', 'nav', 'myAccount', 'Moje konto'),
('pl', 'nav', 'knowledgeCenter', 'Biblioteka'),
('pl', 'nav', 'login', 'Zaloguj się'),
('pl', 'nav', 'logout', 'Wyloguj się'),
-- Role labels
('pl', 'role', 'client', 'Klient'),
('pl', 'role', 'partner', 'Partner'),
('pl', 'role', 'specjalista', 'Specjalista'),
('pl', 'role', 'admin', 'Administrator'),
-- Training keys
('pl', 'training', 'title', 'Akademia'),
-- Dashboard keys
('pl', 'dashboard', 'newDashboard', 'Nowy Panel')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();