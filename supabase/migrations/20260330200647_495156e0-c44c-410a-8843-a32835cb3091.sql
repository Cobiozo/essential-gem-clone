CREATE OR REPLACE FUNCTION public.get_training_reminders_due()
RETURNS TABLE(
  assignment_id uuid,
  user_id uuid,
  module_id uuid,
  user_email text,
  user_first_name text,
  module_title text,
  days_inactive integer,
  reminder_count integer,
  progress_percent integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $function$
DECLARE
  v_settings record;
BEGIN
  -- Get reminder settings
  SELECT * INTO v_settings FROM training_reminder_settings LIMIT 1;
  
  -- If reminders are disabled, return empty
  IF v_settings IS NULL OR NOT v_settings.is_enabled THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    ta.id as assignment_id,
    ta.user_id,
    ta.module_id,
    p.email as user_email,
    p.first_name as user_first_name,
    tm.title as module_title,
    EXTRACT(DAY FROM (NOW() - ta.last_activity_at))::integer as days_inactive,
    ta.reminder_count,
    COALESCE(
      (SELECT COUNT(*)::integer * 100 / NULLIF(
        (SELECT COUNT(*) FROM training_lessons tl_count WHERE tl_count.module_id = ta.module_id), 0
      )
      FROM training_progress tp
      JOIN training_lessons tl ON tl.id = tp.lesson_id
      WHERE tp.user_id = ta.user_id 
        AND tl.module_id = ta.module_id 
        AND tp.is_completed = true
      ), 0
    )::integer as progress_percent
  FROM training_assignments ta
  JOIN profiles p ON p.user_id = ta.user_id
  JOIN training_modules tm ON tm.id = ta.module_id
  WHERE ta.is_completed = false
    AND ta.last_activity_at < NOW() - (v_settings.days_inactive || ' days')::interval
    AND ta.reminder_count < v_settings.max_reminders
    AND (
      ta.last_reminder_sent_at IS NULL 
      OR ta.last_reminder_sent_at < NOW() - (v_settings.reminder_interval_days || ' days')::interval
    )
    AND p.email IS NOT NULL
    AND p.admin_approved = true;
END;
$function$;