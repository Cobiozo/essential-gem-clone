-- Fix training module progress issues
-- 1. Mark training_assignments as completed for users with certificates
UPDATE training_assignments ta
SET 
  is_completed = true,
  completed_at = c.issued_at,
  updated_at = NOW()
FROM certificates c
WHERE ta.user_id = c.user_id 
  AND ta.module_id = c.module_id
  AND (ta.is_completed = false OR ta.is_completed IS NULL);

-- 2. Add missing progress records for lessons added AFTER user's certificate was issued
-- This ensures users with certificates show 100% progress even when new lessons are added
INSERT INTO training_progress (user_id, lesson_id, is_completed, completed_at, time_spent_seconds, started_at)
SELECT DISTINCT 
  c.user_id,
  tl.id,
  true,
  c.issued_at,
  60,
  c.issued_at
FROM certificates c
JOIN training_lessons tl ON tl.module_id = c.module_id
LEFT JOIN training_progress tp ON tp.user_id = c.user_id AND tp.lesson_id = tl.id
WHERE tl.is_active = true
  AND tl.created_at > c.issued_at
  AND tp.id IS NULL
ON CONFLICT (user_id, lesson_id) DO NOTHING;