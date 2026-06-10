
-- 1. Update trigger: exclude 'guest' role from auto-assignment of training modules
CREATE OR REPLACE FUNCTION public.assign_training_modules_on_role_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Guests must NEVER receive auto-assigned modules. Admin assigns them manually.
  IF NEW.role = 'guest' THEN
    RETURN NEW;
  END IF;

  INSERT INTO training_assignments (user_id, module_id, assigned_by, notification_sent)
  SELECT NEW.user_id, tm.id, NULL, false
  FROM training_modules tm
  WHERE tm.is_active = true
    AND (
      (NEW.role = 'partner' AND tm.visible_to_partners = true) OR
      (NEW.role = 'specjalista' AND tm.visible_to_specjalista = true) OR
      (NEW.role IN ('client', 'user') AND tm.visible_to_clients = true) OR
      (NEW.role = 'admin') OR
      tm.visible_to_everyone = true
    )
  ON CONFLICT (user_id, module_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Update trigger: never auto-assign new modules to guests
CREATE OR REPLACE FUNCTION public.assign_training_module_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_active = true THEN
    INSERT INTO training_assignments (user_id, module_id, assigned_by, notification_sent)
    SELECT ur.user_id, NEW.id, NULL, false
    FROM user_roles ur
    WHERE ur.role <> 'guest'
      AND (
        (ur.role = 'partner' AND NEW.visible_to_partners = true) OR
        (ur.role = 'specjalista' AND NEW.visible_to_specjalista = true) OR
        (ur.role IN ('client', 'user') AND NEW.visible_to_clients = true) OR
        (ur.role = 'admin') OR
        NEW.visible_to_everyone = true
      )
    ON CONFLICT (user_id, module_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Cleanup: remove auto-assigned trainings for current guests
DELETE FROM training_assignments ta
USING user_roles ur
WHERE ta.user_id = ur.user_id
  AND ur.role = 'guest'
  AND ta.assigned_by IS NULL;

-- 4. RPC filters: exclude guests with no explicit admin assignment
CREATE OR REPLACE FUNCTION public.get_training_assignments_without_notification()
RETURNS TABLE(assignment_id uuid, user_id uuid, module_id uuid, user_email text, user_first_name text, module_title text, assigned_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.id, ta.user_id, ta.module_id,
    p.email, p.first_name, tm.title, ta.assigned_at
  FROM training_assignments ta
  JOIN profiles p ON p.user_id = ta.user_id
  JOIN training_modules tm ON tm.id = ta.module_id
  LEFT JOIN user_roles ur ON ur.user_id = ta.user_id
  WHERE ta.notification_sent = false
    AND p.email_activated = true
    AND p.is_active = true
    AND COALESCE(p.admin_approved, true) = true
    AND ta.assigned_at > NOW() - INTERVAL '7 days'
    AND (ur.role IS DISTINCT FROM 'guest' OR ta.assigned_by IS NOT NULL)
  ORDER BY ta.assigned_at ASC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_training_reminders_due()
RETURNS TABLE(assignment_id uuid, user_id uuid, module_id uuid, user_email text, user_first_name text, module_title text, days_inactive integer, progress_percent integer, reminder_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  v_days_inactive integer;
  v_max_reminders integer;
  v_reminder_interval integer;
  v_is_enabled boolean;
BEGIN
  SELECT trs.days_inactive, trs.max_reminders, trs.reminder_interval_days, trs.is_enabled
  INTO v_days_inactive, v_max_reminders, v_reminder_interval, v_is_enabled
  FROM training_reminder_settings trs LIMIT 1;

  IF NOT COALESCE(v_is_enabled, false) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    ta.id, ta.user_id, ta.module_id,
    p.email, p.first_name, tm.title,
    EXTRACT(DAY FROM (now() - COALESCE(ta.last_activity_at, ta.assigned_at)))::integer,
    CASE WHEN total_lessons.cnt > 0 
      THEN (COALESCE(completed_lessons.cnt, 0) * 100 / total_lessons.cnt)::integer
      ELSE 0 END,
    COALESCE(ta.reminder_count, 0)
  FROM training_assignments ta
  JOIN profiles p ON p.user_id = ta.user_id
  JOIN training_modules tm ON tm.id = ta.module_id
  LEFT JOIN user_roles ur ON ur.user_id = ta.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS cnt FROM training_lessons tl WHERE tl.module_id = ta.module_id AND tl.is_active = true
  ) total_lessons ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS cnt FROM training_progress tp
    JOIN training_lessons tl2 ON tl2.id = tp.lesson_id
    WHERE tp.user_id = ta.user_id AND tl2.module_id = ta.module_id AND tl2.is_active = true AND tp.is_completed = true
  ) completed_lessons ON true
  WHERE ta.is_completed = false
    AND tm.is_active = true
    AND p.is_active = true
    AND p.email_activated = true
    AND COALESCE(p.admin_approved, true) = true
    AND (ur.role IS DISTINCT FROM 'guest' OR ta.assigned_by IS NOT NULL)
    AND COALESCE(ta.reminder_count, 0) < v_max_reminders
    AND COALESCE(ta.last_activity_at, ta.assigned_at) < now() - (v_days_inactive || ' days')::interval
    AND (ta.last_reminder_sent_at IS NULL OR ta.last_reminder_sent_at < now() - (v_reminder_interval || ' days')::interval)
  ORDER BY p.user_id, tm.title
  LIMIT 200;
END;
$$;

-- 5. Helper to detect role-gated guest restrictions
CREATE OR REPLACE FUNCTION public.is_guest_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'guest');
$$;

GRANT EXECUTE ON FUNCTION public.is_guest_user(uuid) TO authenticated, service_role;
