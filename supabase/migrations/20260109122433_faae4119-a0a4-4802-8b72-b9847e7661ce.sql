-- Fix training progress: mark previous lessons as completed if user progressed to next lesson
UPDATE training_progress tp
SET is_completed = true,
    completed_at = COALESCE(tp.completed_at, tp.updated_at, now())
WHERE tp.is_completed = false
AND EXISTS (
  SELECT 1 FROM training_progress tp2
  JOIN training_lessons tl1 ON tp.lesson_id = tl1.id
  JOIN training_lessons tl2 ON tp2.lesson_id = tl2.id
  WHERE tp2.user_id = tp.user_id
  AND tl1.module_id = tl2.module_id
  AND tl2.position > tl1.position
  AND tp2.time_spent_seconds > 0
);