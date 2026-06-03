-- 1. Dodaj wartość 'moderator' do enuma app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- 2. Tabela uprawnień moderatora (elastyczna mapa modułów -> bool)
CREATE TABLE IF NOT EXISTS public.moderator_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  modules jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderator_permissions TO authenticated;
GRANT ALL ON public.moderator_permissions TO service_role;

ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;

-- Admin: pełne zarządzanie
CREATE POLICY "Admins manage moderator_permissions"
  ON public.moderator_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Moderator: odczyt własnego wiersza
CREATE POLICY "Moderator can read own permissions"
  ON public.moderator_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_moderator_permissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_moderator_permissions_updated_at ON public.moderator_permissions;
CREATE TRIGGER trg_moderator_permissions_updated_at
  BEFORE UPDATE ON public.moderator_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_moderator_permissions_updated_at();

-- 3. Funkcja pomocnicza: czy użytkownik ma włączony dany moduł (admin = zawsze TRUE)
CREATE OR REPLACE FUNCTION public.has_moderator_module(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.moderator_permissions mp
      WHERE mp.user_id = _user_id
        AND (mp.modules ->> _module) = 'true'
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_moderator_module(uuid, text) TO authenticated, anon;