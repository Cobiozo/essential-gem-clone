CREATE OR REPLACE FUNCTION public.get_client_sharing_status(_user_id uuid)
RETURNS TABLE(
  approved_at timestamptz,
  first_login_at timestamptz,
  unlock_at timestamptz,
  time_condition_met boolean,
  training_completed boolean,
  total_lessons integer,
  completed_lessons integer,
  can_share boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
SET row_security = off
AS $$
DECLARE
  v_approved timestamptz;
  v_first_login timestamptz;
  v_base timestamptz;
  v_unlock timestamptz;
  v_time_ok boolean := false;
  v_module_id uuid;
  v_total integer := 0;
  v_done integer := 0;
  v_training_ok boolean := false;
BEGIN
  SELECT COALESCE(p.leader_approved_at, p.admin_approved_at, p.guardian_approved_at, p.created_at)
    INTO v_approved
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  SELECT MIN(l.login_at) INTO v_first_login
  FROM public.login_audit_log l
  WHERE l.user_id = _user_id
    AND (l.login_status IS NULL OR l.login_status IN ('success', 'successful', 'ok'));

  v_base := GREATEST(COALESCE(v_approved, v_first_login), COALESCE(v_first_login, v_approved));

  IF v_base IS NOT NULL THEN
    v_unlock := v_base + interval '48 hours';
  END IF;

  v_time_ok := v_unlock IS NOT NULL AND now() >= v_unlock;

  SELECT m.id INTO v_module_id
  FROM public.training_modules m
  WHERE m.is_active = true
    AND upper(m.title) LIKE 'NIEZB%DNIK KLIENTA'
  ORDER BY (m.language_code = 'pl') DESC, m.position
  LIMIT 1;

  IF v_module_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total
    FROM public.training_lessons tl
    WHERE tl.module_id = v_module_id AND tl.is_active = true;

    SELECT COUNT(*) INTO v_done
    FROM public.training_progress tp
    JOIN public.training_lessons tl ON tl.id = tp.lesson_id
    WHERE tp.user_id = _user_id
      AND tp.is_completed = true
      AND tl.module_id = v_module_id
      AND tl.is_active = true;

    v_training_ok := v_total > 0 AND v_done >= v_total;
  END IF;

  RETURN QUERY SELECT
    v_approved, v_first_login, v_unlock, v_time_ok, v_training_ok, v_total, v_done,
    (v_time_ok AND v_training_ok);
END;
$$;