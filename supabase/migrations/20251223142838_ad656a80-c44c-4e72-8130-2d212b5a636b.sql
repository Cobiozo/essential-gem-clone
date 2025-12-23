-- Tabela konfiguracji SMTP (globalna)
CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 465,
  smtp_encryption text NOT NULL DEFAULT 'ssl',
  smtp_username text NOT NULL DEFAULT '',
  smtp_password text NOT NULL DEFAULT '',
  sender_email text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  last_test_at timestamptz,
  last_test_result boolean,
  last_test_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Włączamy RLS
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- Tylko admin może odczytywać i modyfikować ustawienia SMTP
CREATE POLICY "Admins can view SMTP settings"
ON public.smtp_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert SMTP settings"
ON public.smtp_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update SMTP settings"
ON public.smtp_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger dla updated_at
CREATE TRIGGER update_smtp_settings_updated_at
BEFORE UPDATE ON public.smtp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Wstawmy domyślny rekord
INSERT INTO public.smtp_settings (smtp_host, smtp_port, smtp_encryption, smtp_username, sender_email, sender_name)
VALUES ('', 465, 'ssl', '', '', '')
ON CONFLICT DO NOTHING;