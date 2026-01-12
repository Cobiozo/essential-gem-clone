-- Add remaining missing translation keys for auth
INSERT INTO public.i18n_translations (language_code, namespace, key, value) VALUES
-- Auth errors - additional
('pl', 'auth', 'errors.eqIdNotFound', 'Nie znaleziono użytkownika z podanym EQ ID'),
('pl', 'auth', 'errors.userLookupError', 'Błąd podczas wyszukiwania użytkownika'),
('pl', 'auth', 'errors.passwordsMismatch', 'Hasła nie są identyczne'),
('pl', 'auth', 'errors.eqIdRequired', 'EQ ID jest wymagane'),
('pl', 'auth', 'errors.roleRequired', 'Wybór roli jest wymagany'),
('pl', 'auth', 'errors.phoneRequired', 'Numer telefonu jest wymagany'),
('pl', 'auth', 'errors.phoneInvalid', 'Nieprawidłowy format numeru telefonu (6-15 cyfr)'),
('pl', 'auth', 'errors.guardianRequired', 'Musisz wybrać opiekuna z listy'),
('pl', 'auth', 'errors.emailExistsLogin', 'Użytkownik z tym adresem email już istnieje. Zaloguj się lub sprawdź skrzynkę pocztową.'),
('pl', 'auth', 'errors.enterEmailOrEqId', 'Wprowadź adres email lub EQ ID aby zresetować hasło'),
-- Auth UI - additional
('pl', 'auth', 'adminPanel', 'Panel administracyjny'),
('pl', 'auth', 'enterCredentials', 'Wprowadź swoje dane aby uzyskać dostęp do panelu'),
('pl', 'auth', 'createAccountDesc', 'Utwórz nowe konto w systemie Pure Life'),
('pl', 'auth', 'clickLinkToActivate', 'Kliknij link w wiadomości, aby aktywować konto.'),
('pl', 'auth', 'noEmailReceived', 'Nie otrzymałeś wiadomości?'),
('pl', 'auth', 'roleSetByReflink', 'Rola została ustawiona przez link polecający'),
('pl', 'auth', 'guardianSetByReflink', 'Opiekun został ustawiony przez link polecający')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();