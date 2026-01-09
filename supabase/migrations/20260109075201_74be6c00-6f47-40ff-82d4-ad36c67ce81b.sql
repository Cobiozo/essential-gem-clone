-- Naprawa istniejących rekordów gdzie is_completed=false mimo spełnienia warunku czasowego
UPDATE training_progress tp
SET 
  is_completed = true,
  completed_at = COALESCE(tp.completed_at, tp.updated_at),
  updated_at = now()
FROM training_lessons tl
WHERE tp.lesson_id = tl.id
AND tp.time_spent_seconds >= tl.min_time_seconds
AND tp.is_completed = false;