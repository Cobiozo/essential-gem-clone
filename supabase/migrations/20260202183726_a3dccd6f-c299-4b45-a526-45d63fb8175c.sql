-- Dodanie kolumny google_email do tabeli user_google_tokens
ALTER TABLE public.user_google_tokens
ADD COLUMN google_email TEXT;

COMMENT ON COLUMN public.user_google_tokens.google_email IS 'Email konta Google używanego do synchronizacji kalendarza';