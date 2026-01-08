-- =====================================================
-- ETAP 1: Tabela globalnych ustawień linków afiliacyjnych
-- =====================================================
CREATE TABLE public.reflink_global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Domyślna ważność linków: 30 dni
INSERT INTO public.reflink_global_settings (setting_key, setting_value) VALUES
  ('link_validity_days', '30');

ALTER TABLE public.reflink_global_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Wszyscy zalogowani mogą czytać
CREATE POLICY "Authenticated can read global settings"
ON public.reflink_global_settings FOR SELECT
TO authenticated
USING (true);

-- RLS: Tylko admin może modyfikować
CREATE POLICY "Admins can manage global settings"
ON public.reflink_global_settings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =====================================================
-- ETAP 2: Tabela ustawień generowania linków per-rola
-- =====================================================
CREATE TABLE public.reflink_generation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  can_generate BOOLEAN NOT NULL DEFAULT false,
  allowed_target_roles app_role[] NOT NULL DEFAULT ARRAY['admin','partner','specjalista','client']::app_role[],
  max_links_per_user INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Domyślne ustawienia dla każdej roli (admin włączony, reszta wyłączona)
INSERT INTO public.reflink_generation_settings (role, can_generate, allowed_target_roles, max_links_per_user) VALUES
  ('admin', true, ARRAY['admin','partner','specjalista','client']::app_role[], 100),
  ('partner', false, ARRAY['admin','partner','specjalista','client']::app_role[], 10),
  ('specjalista', false, ARRAY['admin','partner','specjalista','client']::app_role[], 10),
  ('client', false, ARRAY['admin','partner','specjalista','client']::app_role[], 10);

ALTER TABLE public.reflink_generation_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Wszyscy zalogowani mogą czytać (potrzebne do sprawdzenia uprawnień)
CREATE POLICY "Authenticated can read generation settings"
ON public.reflink_generation_settings FOR SELECT
TO authenticated
USING (true);

-- RLS: Tylko admin może modyfikować
CREATE POLICY "Admins can manage generation settings"
ON public.reflink_generation_settings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =====================================================
-- ETAP 3: Tabela linków afiliacyjnych użytkowników
-- =====================================================
CREATE TABLE public.user_reflinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  target_role app_role NOT NULL,
  reflink_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  click_count INTEGER NOT NULL DEFAULT 0,
  registration_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_reflinks_creator ON public.user_reflinks(creator_user_id);
CREATE INDEX idx_user_reflinks_code ON public.user_reflinks(reflink_code);
CREATE INDEX idx_user_reflinks_expires ON public.user_reflinks(expires_at);
CREATE INDEX idx_user_reflinks_active_valid ON public.user_reflinks(is_active, expires_at) WHERE is_active = true;

ALTER TABLE public.user_reflinks ENABLE ROW LEVEL SECURITY;

-- RLS: Wszyscy mogą czytać AKTYWNE I WAŻNE linki (walidacja w Auth.tsx)
CREATE POLICY "Anyone can read valid reflinks"
ON public.user_reflinks FOR SELECT
USING (is_active = true AND expires_at > now());

-- RLS: Zalogowani mogą czytać WSZYSTKIE własne linki (w tym wygasłe)
CREATE POLICY "Users can read own reflinks"
ON public.user_reflinks FOR SELECT
TO authenticated
USING (creator_user_id = auth.uid());

-- RLS: Admin może czytać wszystkie linki
CREATE POLICY "Admins can read all reflinks"
ON public.user_reflinks FOR SELECT
TO authenticated
USING (public.is_admin());

-- RLS: INSERT tylko jeśli rola ma uprawnienia i nie przekroczono limitu
CREATE POLICY "Users can create reflinks if permitted"
ON public.user_reflinks FOR INSERT
TO authenticated
WITH CHECK (
  creator_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.reflink_generation_settings rgs
    JOIN public.user_roles ur ON ur.role = rgs.role
    WHERE ur.user_id = auth.uid()
      AND rgs.can_generate = true
      AND target_role = ANY(rgs.allowed_target_roles)
      AND (SELECT COUNT(*) FROM public.user_reflinks WHERE creator_user_id = auth.uid()) < rgs.max_links_per_user
  )
);

-- RLS: UPDATE tylko własnych linków
CREATE POLICY "Users can update own reflinks"
ON public.user_reflinks FOR UPDATE
TO authenticated
USING (creator_user_id = auth.uid())
WITH CHECK (creator_user_id = auth.uid());

-- RLS: Admin może aktualizować wszystkie linki
CREATE POLICY "Admins can update any reflink"
ON public.user_reflinks FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- RLS: DELETE tylko admin
CREATE POLICY "Admins can delete any reflink"
ON public.user_reflinks FOR DELETE
TO authenticated
USING (public.is_admin());

-- =====================================================
-- ETAP 4: Rozszerzenie tabeli profiles
-- =====================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS registered_via_reflink UUID REFERENCES public.user_reflinks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reflink_code_used TEXT;

-- =====================================================
-- ETAP 5: Funkcja generowania losowego kodu
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_user_reflink_code(p_eq_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  random_part TEXT;
  final_code TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i INTEGER;
BEGIN
  LOOP
    random_part := '';
    FOR i IN 1..6 LOOP
      random_part := random_part || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Format: u-{random6}-{eq_id}
    final_code := 'u-' || random_part || '-' || COALESCE(p_eq_id, 'anon');
    
    -- Sprawdź unikalność
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.user_reflinks WHERE reflink_code = final_code);
  END LOOP;
  
  RETURN final_code;
END;
$$;

-- =====================================================
-- ETAP 6: Funkcja pobierania aktualnej ważności
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_reflink_validity_days()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(setting_value::integer, 30)
  FROM public.reflink_global_settings
  WHERE setting_key = 'link_validity_days'
  LIMIT 1;
$$;

-- =====================================================
-- ETAP 7: Rozszerzenie triggera handle_new_user
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_user_reflink_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reflink_id UUID;
  v_reflink_code TEXT;
BEGIN
  v_reflink_code := NEW.raw_user_meta_data ->> 'reflink_code';
  
  -- Sprawdź czy to link użytkownika (prefiks u-)
  IF v_reflink_code IS NOT NULL AND v_reflink_code LIKE 'u-%' THEN
    -- Znajdź WAŻNY link afiliacyjny
    SELECT id INTO v_reflink_id
    FROM public.user_reflinks
    WHERE reflink_code = v_reflink_code 
      AND is_active = true 
      AND expires_at > now();
    
    IF v_reflink_id IS NOT NULL THEN
      -- Zwiększ licznik rejestracji
      UPDATE public.user_reflinks
      SET registration_count = registration_count + 1, updated_at = now()
      WHERE id = v_reflink_id;
      
      -- Zapisz w profilu nowego użytkownika
      UPDATE public.profiles
      SET registered_via_reflink = v_reflink_id,
          reflink_code_used = v_reflink_code
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger uruchamiany PO handle_new_user (po utworzeniu profilu)
CREATE TRIGGER on_auth_user_created_handle_reflink
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_reflink_registration();