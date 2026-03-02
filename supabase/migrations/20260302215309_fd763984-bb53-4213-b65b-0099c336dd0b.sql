
-- Warstwa 1: Trigger bazodanowy - automatyczne zatwierdzanie ukończonych szkoleń
CREATE OR REPLACE FUNCTION public.auto_complete_training_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_module_id uuid;
  v_total_lessons int;
  v_completed_lessons int;
BEGIN
  SELECT module_id INTO v_module_id
  FROM training_lessons WHERE id = NEW.lesson_id;

  IF v_module_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.is_completed = true THEN
    SELECT COUNT(*) INTO v_total_lessons
    FROM training_lessons
    WHERE module_id = v_module_id AND is_active = true;

    SELECT COUNT(*) INTO v_completed_lessons
    FROM training_progress tp
    JOIN training_lessons tl ON tl.id = tp.lesson_id
    WHERE tp.user_id = NEW.user_id
      AND tl.module_id = v_module_id
      AND tl.is_active = true
      AND tp.is_completed = true;

    IF v_completed_lessons >= v_total_lessons AND v_total_lessons > 0 THEN
      UPDATE training_assignments
      SET is_completed = true,
          completed_at = COALESCE(completed_at, now()),
          updated_at = now()
      WHERE user_id = NEW.user_id
        AND module_id = v_module_id
        AND is_completed = false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_complete_training
AFTER INSERT OR UPDATE ON training_progress
FOR EACH ROW
EXECUTE FUNCTION auto_complete_training_assignment();

-- Jednorazowa naprawa istniejących niespójności
UPDATE training_assignments ta
SET is_completed = true,
    completed_at = COALESCE(ta.completed_at, now()),
    updated_at = now()
WHERE ta.is_completed = false
  AND (
    SELECT COUNT(*) FROM training_lessons tl
    WHERE tl.module_id = ta.module_id AND tl.is_active = true
  ) > 0
  AND (
    SELECT COUNT(*) FROM training_lessons tl
    WHERE tl.module_id = ta.module_id AND tl.is_active = true
  ) = (
    SELECT COUNT(*) FROM training_progress tp
    JOIN training_lessons tl ON tl.id = tp.lesson_id
    WHERE tp.user_id = ta.user_id
      AND tl.module_id = ta.module_id
      AND tl.is_active = true
      AND tp.is_completed = true
  );
