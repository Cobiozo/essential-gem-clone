-- Napraw training_assignments gdzie wszystkie lekcje są ukończone ale is_completed = false
WITH completed_modules AS (
  SELECT 
    ta.user_id,
    ta.module_id,
    COUNT(DISTINCT tl.id) as total_lessons,
    COUNT(DISTINCT CASE WHEN tp.is_completed THEN tl.id END) as completed_lessons
  FROM training_assignments ta
  JOIN training_lessons tl ON tl.module_id = ta.module_id AND tl.is_active = true
  LEFT JOIN training_progress tp ON tp.lesson_id = tl.id AND tp.user_id = ta.user_id
  WHERE ta.is_completed = false
  GROUP BY ta.user_id, ta.module_id
  HAVING COUNT(DISTINCT tl.id) = COUNT(DISTINCT CASE WHEN tp.is_completed THEN tl.id END)
    AND COUNT(DISTINCT tl.id) > 0
)
UPDATE training_assignments ta
SET 
  is_completed = true,
  completed_at = NOW()
FROM completed_modules cm
WHERE ta.user_id = cm.user_id 
  AND ta.module_id = cm.module_id
  AND ta.is_completed = false;