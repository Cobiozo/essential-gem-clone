
CREATE OR REPLACE FUNCTION public.check_training_module_unlock(p_user_id uuid, p_module_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  v_unlock_order int;
  v_language_code text;
  v_training_language text;
  v_prev_module record;
  v_total_lessons int;
  v_completed_lessons int;
BEGIN
  -- Get the module's unlock_order and language
  SELECT unlock_order, language_code INTO v_unlock_order, v_language_code
  FROM training_modules
  WHERE id = p_module_id AND is_active = true;

  -- If module not found or has no unlock_order, allow access
  IF v_unlock_order IS NULL THEN
    RETURN true;
  END IF;

  -- Get user's training language
  SELECT training_language INTO v_training_language
  FROM profiles
  WHERE user_id = p_user_id;

  -- Only enforce for matching language
  IF v_training_language IS NULL OR v_language_code IS NULL OR v_language_code != v_training_language THEN
    RETURN true;
  END IF;

  -- Check all previous modules in sequence
  FOR v_prev_module IN
    SELECT id, unlock_order
    FROM training_modules
    WHERE unlock_order IS NOT NULL
      AND unlock_order < v_unlock_order
      AND is_active = true
      AND language_code = v_training_language
    ORDER BY unlock_order
  LOOP
    -- Count total active lessons
    SELECT COUNT(*) INTO v_total_lessons
    FROM training_lessons
    WHERE module_id = v_prev_module.id AND is_active = true;

    IF v_total_lessons = 0 THEN
      CONTINUE;
    END IF;

    -- Count completed lessons
    SELECT COUNT(*) INTO v_completed_lessons
    FROM training_progress tp
    JOIN training_lessons tl ON tl.id = tp.lesson_id
    WHERE tp.user_id = p_user_id
      AND tl.module_id = v_prev_module.id
      AND tl.is_active = true
      AND tp.is_completed = true;

    IF v_completed_lessons < v_total_lessons THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;
