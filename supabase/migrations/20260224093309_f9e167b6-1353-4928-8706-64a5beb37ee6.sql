UPDATE public.email_templates
SET body_html = REPLACE(
  REPLACE(
    body_html,
    'Zaloguj się do systemu',
    'Zmień hasło tymczasowe'
  ),
  'Kliknij poniższy przycisk, aby zalogować się do systemu:',
  'Kliknij poniższy przycisk, aby zmienić hasło tymczasowe na własne. Na następnej stronie wpisz hasło tymczasowe z tej wiadomości, a następnie ustal nowe hasło:'
)
WHERE internal_name = 'password_reset_admin';