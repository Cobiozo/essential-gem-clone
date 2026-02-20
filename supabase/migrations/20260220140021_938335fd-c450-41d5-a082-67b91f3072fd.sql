
-- ============================================================
-- 1. Nowe kolumny w profiles (status zatwierdzenia przez lidera)
-- ============================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leader_approved boolean DEFAULT NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leader_approved_at timestamptz DEFAULT NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leader_approver_id uuid DEFAULT NULL;

-- ============================================================
-- 2. Nowa kolumna w leader_permissions
-- ============================================================
ALTER TABLE public.leader_permissions 
ADD COLUMN IF NOT EXISTS can_approve_registrations boolean DEFAULT false;

-- ============================================================
-- 3. Funkcja: find_nearest_leader_approver
-- Rekurencyjnie przeszukuje ścieżkę upline (max 20 poziomów)
-- Zwraca UUID pierwszego lidera z can_approve_registrations = true
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_nearest_leader_approver(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_upline_eq_id text;
  upline_user_id uuid;
  next_upline_eq_id text;
  depth int := 0;
BEGIN
  -- Pobierz upline_eq_id osoby do zatwierdzenia
  SELECT p.upline_eq_id INTO current_upline_eq_id
  FROM profiles p WHERE p.user_id = p_user_id;

  WHILE current_upline_eq_id IS NOT NULL AND depth < 20 LOOP
    -- Znajdź użytkownika z tym eq_id
    SELECT p.user_id, p.upline_eq_id 
    INTO upline_user_id, next_upline_eq_id
    FROM profiles p 
    WHERE p.eq_id = current_upline_eq_id 
      AND p.is_active = true
    LIMIT 1;

    IF upline_user_id IS NULL THEN
      RETURN NULL; -- Koniec ścieżki, nie znaleziono
    END IF;

    -- Sprawdź czy ten user ma can_approve_registrations
    IF EXISTS (
      SELECT 1 FROM leader_permissions lp
      WHERE lp.user_id = upline_user_id
        AND lp.can_approve_registrations = true
    ) THEN
      RETURN upline_user_id; -- Znaleziono lidera z uprawnieniem
    END IF;

    current_upline_eq_id := next_upline_eq_id;
    depth := depth + 1;
  END LOOP;

  RETURN NULL; -- Nie znaleziono lidera w ścieżce
END;
$$;

-- ============================================================
-- 4. Funkcja: leader_approve_user
-- Lider zatwierdza rejestrację — zastępuje zatwierdzenie admina
-- ============================================================
CREATE OR REPLACE FUNCTION public.leader_approve_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_first_name text;
  target_last_name text;
BEGIN
  -- Sprawdź uprawnienia lidera
  IF NOT EXISTS (
    SELECT 1 FROM leader_permissions
    WHERE user_id = auth.uid() AND can_approve_registrations = true
  ) THEN
    RAISE EXCEPTION 'Brak uprawnień do zatwierdzania rejestracji';
  END IF;

  -- Sprawdź że target czeka na zatwierdzenie lidera lub admina
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = target_user_id 
      AND guardian_approved = true
      AND admin_approved = false
  ) THEN
    RAISE EXCEPTION 'Użytkownik nie oczekuje na zatwierdzenie lub już został zatwierdzony';
  END IF;

  -- Pobierz dane użytkownika
  SELECT first_name, last_name INTO target_first_name, target_last_name
  FROM profiles WHERE user_id = target_user_id;

  -- Zatwierdź — lider ma uprawnienie finalne, ustawia admin_approved = true
  UPDATE profiles SET
    leader_approved = true,
    leader_approved_at = now(),
    leader_approver_id = auth.uid(),
    admin_approved = true,
    admin_approved_at = now(),
    updated_at = now()
  WHERE user_id = target_user_id;

  -- Powiadomienie in-app dla zatwierdzonego użytkownika
  INSERT INTO user_notifications (user_id, notification_type, source_module, title, message, metadata)
  VALUES (
    target_user_id,
    'approval_status',
    'registration',
    'Twoje konto zostało zatwierdzone!',
    'Lider zatwierdził Twoją rejestrację. Możesz teraz w pełni korzystać z systemu. Witamy!',
    jsonb_build_object('leader_approved', true, 'admin_approved', true, 'approver_id', auth.uid(), 'approver_type', 'leader')
  );

  RETURN true;
END;
$$;

-- ============================================================
-- 5. Funkcja: leader_reject_user
-- Lider odrzuca rejestrację
-- ============================================================
CREATE OR REPLACE FUNCTION public.leader_reject_user(target_user_id uuid, rejection_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_first_name text;
  target_last_name text;
  target_email text;
BEGIN
  -- Sprawdź uprawnienia lidera
  IF NOT EXISTS (
    SELECT 1 FROM leader_permissions
    WHERE user_id = auth.uid() AND can_approve_registrations = true
  ) THEN
    RAISE EXCEPTION 'Brak uprawnień do odrzucania rejestracji';
  END IF;

  -- Sprawdź że target czeka na zatwierdzenie
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = target_user_id 
      AND guardian_approved = true
      AND admin_approved = false
  ) THEN
    RAISE EXCEPTION 'Użytkownik nie oczekuje na zatwierdzenie lub już został zatwierdzony';
  END IF;

  -- Pobierz dane
  SELECT first_name, last_name, email INTO target_first_name, target_last_name, target_email
  FROM profiles WHERE user_id = target_user_id;

  -- Dezaktywuj profil
  UPDATE profiles SET 
    is_active = false, 
    updated_at = now()
  WHERE user_id = target_user_id;

  -- Powiadomienie dla odrzuconego
  INSERT INTO user_notifications (user_id, notification_type, source_module, title, message, metadata)
  VALUES (
    target_user_id,
    'approval_status',
    'registration',
    'Rejestracja odrzucona',
    COALESCE('Lider odrzucił Twoją rejestrację. Powód: ' || rejection_reason, 'Lider odrzucił Twoją rejestrację. Skontaktuj się z administratorem.'),
    jsonb_build_object('rejected', true, 'rejection_reason', rejection_reason, 'approver_type', 'leader')
  );

  -- Powiadom adminów o odrzuceniu przez lidera
  INSERT INTO user_notifications (user_id, notification_type, source_module, title, message, metadata)
  SELECT 
    ur.user_id,
    'approval_status',
    'registration',
    'Lider odrzucił rejestrację',
    format('Lider odrzucił rejestrację użytkownika %s %s (%s). Powód: %s', 
      target_first_name, target_last_name, target_email, COALESCE(rejection_reason, 'brak podanego powodu')),
    jsonb_build_object('target_user_id', target_user_id, 'leader_id', auth.uid(), 'rejection_reason', rejection_reason)
  FROM user_roles ur
  WHERE ur.role = 'admin';

  RETURN true;
END;
$$;

-- ============================================================
-- 6. Funkcja: get_pending_leader_approvals
-- Zwraca listę użytkowników oczekujących na zatwierdzenie
-- przez aktualnie zalogowanego lidera (lub wszystkich oczekujących gdy leader_approved = false)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_pending_leader_approvals()
RETURNS TABLE(
  user_id uuid, 
  first_name text, 
  last_name text, 
  email text, 
  eq_id text, 
  upline_eq_id text, 
  upline_first_name text,
  upline_last_name text,
  created_at timestamptz, 
  guardian_approved_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM leader_permissions
    WHERE leader_permissions.user_id = auth.uid() AND can_approve_registrations = true
  ) THEN
    RAISE EXCEPTION 'Brak uprawnień do przeglądania oczekujących zatwierdzeń';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id, 
    p.first_name, 
    p.last_name, 
    p.email, 
    p.eq_id, 
    p.upline_eq_id,
    p.upline_first_name,
    p.upline_last_name,
    p.created_at, 
    p.guardian_approved_at
  FROM profiles p
  WHERE p.guardian_approved = true
    AND p.admin_approved = false
    AND p.is_active = true
    AND p.leader_approver_id = auth.uid()
  ORDER BY p.guardian_approved_at ASC NULLS LAST;
END;
$$;

-- ============================================================
-- 7. Modyfikacja guardian_approve_user — dodanie logiki lidera
-- ============================================================
CREATE OR REPLACE FUNCTION public.guardian_approve_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  guardian_eq_id text;
  target_upline_eq_id text;
  target_first_name text;
  target_last_name text;
  target_email_activated boolean;
  v_leader_approver_id uuid;
BEGIN
  -- Get current user's EQ ID
  SELECT eq_id INTO guardian_eq_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Get target user's upline EQ ID, name, and email activation status
  SELECT upline_eq_id, first_name, last_name, email_activated 
  INTO target_upline_eq_id, target_first_name, target_last_name, target_email_activated
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  -- Check if the current user is the guardian of the target user
  IF guardian_eq_id IS NULL OR target_upline_eq_id IS NULL OR guardian_eq_id != target_upline_eq_id THEN
    RAISE EXCEPTION 'Access denied: You are not the guardian of this user';
  END IF;
  
  -- Check if email is activated
  IF target_email_activated IS NOT TRUE THEN
    RAISE EXCEPTION 'Cannot approve user: email not confirmed yet. User must confirm their email before guardian approval.';
  END IF;
  
  -- Check if already approved by guardian
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id AND guardian_approved = TRUE) THEN
    RAISE EXCEPTION 'User is already approved by guardian';
  END IF;
  
  -- Update the profile — guardian approved
  UPDATE public.profiles
  SET guardian_approved = TRUE,
      guardian_approved_at = NOW(),
      updated_at = NOW()
  WHERE user_id = target_user_id;

  -- Szukaj lidera w ścieżce rekrutacji
  v_leader_approver_id := public.find_nearest_leader_approver(target_user_id);

  IF v_leader_approver_id IS NOT NULL THEN
    -- Lider znaleziony — przypisz go do zatwierdzenia
    UPDATE public.profiles SET
      leader_approved = false,
      leader_approver_id = v_leader_approver_id,
      updated_at = now()
    WHERE user_id = target_user_id;

    -- Powiadom LIDERA o nowym oczekującym zatwierdzeniu
    INSERT INTO public.user_notifications (
      user_id, notification_type, source_module, title, message, link, metadata
    )
    VALUES (
      v_leader_approver_id,
      'approval_request',
      'registration',
      'Nowa osoba oczekuje na Twoje zatwierdzenie',
      format('Użytkownik %s %s został zatwierdzony przez opiekuna i oczekuje na Twoje zatwierdzenie jako Lider.', target_first_name, target_last_name),
      '/leader?tab=approvals',
      jsonb_build_object('target_user_id', target_user_id, 'guardian_id', auth.uid())
    );

    -- Powiadom ADMINÓW — oni też mogą zatwierdzić w każdej chwili
    INSERT INTO public.user_notifications (
      user_id, notification_type, source_module, title, message, link, metadata
    )
    SELECT 
      ur.user_id,
      'approval_request',
      'registration',
      'Nowy użytkownik oczekuje na zatwierdzenie (ma Lidera)',
      format('Użytkownik %s %s oczekuje na zatwierdzenie. Lider w ścieżce rekrutacji został powiadomiony, ale możesz też zatwierdzić Ty.', target_first_name, target_last_name),
      '/admin?tab=users',
      jsonb_build_object('target_user_id', target_user_id, 'guardian_id', auth.uid(), 'leader_approver_id', v_leader_approver_id)
    FROM public.user_roles ur
    WHERE ur.role = 'admin';

    -- Powiadom UŻYTKOWNIKA że oczekuje na Lidera lub Admina
    INSERT INTO public.user_notifications (
      user_id, notification_type, source_module, title, message, metadata
    )
    VALUES (
      target_user_id,
      'approval_status',
      'registration',
      'Opiekun zatwierdził Twoją rejestrację!',
      'Twój opiekun zatwierdził Twoją rejestrację. Teraz oczekujesz na zatwierdzenie przez Lidera lub Administratora.',
      jsonb_build_object('guardian_approved', true, 'admin_approved', false, 'awaiting_leader', true, 'leader_approver_id', v_leader_approver_id)
    );
  ELSE
    -- Brak lidera w ścieżce — standardowy przepływ tylko do admina
    INSERT INTO public.user_notifications (
      user_id, notification_type, source_module, title, message, link, metadata
    )
    SELECT 
      ur.user_id,
      'approval_request',
      'registration',
      'Nowy użytkownik oczekuje na zatwierdzenie',
      format('Użytkownik %s %s został zatwierdzony przez opiekuna i oczekuje na Twoje zatwierdzenie.', target_first_name, target_last_name),
      '/admin?tab=users',
      jsonb_build_object('target_user_id', target_user_id, 'guardian_id', auth.uid())
    FROM public.user_roles ur
    WHERE ur.role = 'admin';

    -- Powiadom użytkownika — oczekuje na admina
    INSERT INTO public.user_notifications (
      user_id, notification_type, source_module, title, message, metadata
    )
    VALUES (
      target_user_id,
      'approval_status',
      'registration',
      'Opiekun zatwierdził Twoją rejestrację!',
      'Twój opiekun zatwierdził Twoją rejestrację. Teraz oczekujesz na zatwierdzenie przez Administratora.',
      jsonb_build_object('guardian_approved', true, 'admin_approved', false, 'awaiting_leader', false)
    );
  END IF;
  
  RETURN TRUE;
END;
$$;

-- ============================================================
-- 8. Modyfikacja admin_approve_user (z bypass_guardian) — 
--    admin może zawsze zatwierdzić, przy okazji ustawia leader_approved dla spójności
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_user(target_user_id uuid, bypass_guardian boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_guardian_approved boolean;
  target_first_name text;
  target_last_name text;
  target_leader_approved boolean;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can approve users';
  END IF;
  
  -- Get target user info
  SELECT guardian_approved, first_name, last_name, leader_approved
  INTO target_guardian_approved, target_first_name, target_last_name, target_leader_approved
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  -- Check if guardian has approved first (unless bypassing)
  IF NOT bypass_guardian AND (target_guardian_approved IS NULL OR target_guardian_approved = FALSE) THEN
    RAISE EXCEPTION 'User must be approved by guardian first. Use bypass_guardian=true to skip guardian approval.';
  END IF;
  
  -- Check if already approved by admin
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id AND admin_approved = TRUE) THEN
    RAISE EXCEPTION 'User is already approved by admin';
  END IF;
  
  -- If bypassing guardian, also set guardian_approved to true
  IF bypass_guardian AND (target_guardian_approved IS NULL OR target_guardian_approved = FALSE) THEN
    UPDATE public.profiles
    SET guardian_approved = TRUE,
        guardian_approved_at = NOW(),
        admin_approved = TRUE,
        admin_approved_at = NOW(),
        -- Jeśli lider był w ścieżce i czekał, oznacz leader_approved dla spójności danych
        leader_approved = CASE WHEN target_leader_approved = false THEN true ELSE leader_approved END,
        leader_approved_at = CASE WHEN target_leader_approved = false THEN NOW() ELSE leader_approved_at END,
        updated_at = NOW()
    WHERE user_id = target_user_id;
  ELSE
    -- Normal flow - guardian already approved. Admin zatwierdza niezależnie od lidera.
    UPDATE public.profiles
    SET admin_approved = TRUE,
        admin_approved_at = NOW(),
        -- Jeśli lider był przypisany (leader_approved = false), oznacz też leader_approved dla spójności
        leader_approved = CASE WHEN target_leader_approved = false THEN true ELSE leader_approved END,
        leader_approved_at = CASE WHEN target_leader_approved = false THEN NOW() ELSE leader_approved_at END,
        updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;
  
  -- Send notification to the user
  INSERT INTO public.user_notifications (
    user_id,
    notification_type,
    source_module,
    title,
    message,
    metadata
  )
  VALUES (
    target_user_id,
    'approval_status',
    'registration',
    'Twoje konto zostało w pełni zatwierdzone!',
    'Administrator zatwierdził Twoje konto. Możesz teraz w pełni korzystać z systemu. Witamy!',
    jsonb_build_object('guardian_approved', true, 'admin_approved', true, 'bypass_used', bypass_guardian, 'approver_type', 'admin')
  );
  
  RETURN TRUE;
END;
$$;
