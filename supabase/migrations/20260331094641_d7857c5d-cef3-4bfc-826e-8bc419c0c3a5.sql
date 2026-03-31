
DROP FUNCTION IF EXISTS public.get_training_reminders_due();

CREATE OR REPLACE FUNCTION public.get_training_reminders_due()
RETURNS TABLE(
  assignment_id uuid,
  user_id uuid,
  module_id uuid,
  user_email text,
  user_first_name text,
  module_title text,
  days_inactive integer,
  progress_percent integer,
  reminder_count integer
)
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
  FROM training_reminder_settings trs
  LIMIT 1;

  IF NOT COALESCE(v_is_enabled, false) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ta.id AS assignment_id,
    ta.user_id,
    ta.module_id,
    p.email AS user_email,
    p.first_name AS user_first_name,
    tm.title AS module_title,
    EXTRACT(DAY FROM (now() - COALESCE(ta.last_activity_at, ta.assigned_at)))::integer AS days_inactive,
    CASE WHEN total_lessons.cnt > 0 
      THEN (COALESCE(completed_lessons.cnt, 0) * 100 / total_lessons.cnt)::integer
      ELSE 0 
    END AS progress_percent,
    COALESCE(ta.reminder_count, 0) AS reminder_count
  FROM training_assignments ta
  JOIN profiles p ON p.user_id = ta.user_id
  JOIN training_modules tm ON tm.id = ta.module_id
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
    AND COALESCE(ta.reminder_count, 0) < v_max_reminders
    AND COALESCE(ta.last_activity_at, ta.assigned_at) < now() - (v_days_inactive || ' days')::interval
    AND (ta.last_reminder_sent_at IS NULL OR ta.last_reminder_sent_at < now() - (v_reminder_interval || ' days')::interval)
  ORDER BY p.user_id, tm.title
  LIMIT 200;
END;
$$;
