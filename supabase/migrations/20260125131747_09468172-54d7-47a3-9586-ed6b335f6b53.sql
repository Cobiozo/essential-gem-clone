-- Send one-time notifications to users WITH progress but WITHOUT certificates for SPRZEDAŻOWE module
INSERT INTO user_notifications (
  user_id, 
  notification_type, 
  source_module, 
  title, 
  message, 
  link, 
  metadata
)
SELECT DISTINCT ON (p.user_id)
  p.user_id,
  'training_new_lessons',
  'training',
  'Nowe materiały szkoleniowe',
  'Do modułu SPRZEDAŻOWE zostały dodane nowe lekcje. Ukończ wszystkie materiały aby uzyskać certyfikat.',
  '/training/c6ab5d58-d77e-43e8-b246-a5e15c0f836f',
  jsonb_build_object(
    'module_id', 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f',
    'module_title', 'SPRZEDAŻOWE',
    'new_lessons_count', 3,
    'has_certificate', false
  )
FROM profiles p
JOIN training_progress tp ON tp.user_id = p.user_id AND tp.is_completed = true
JOIN training_lessons tl ON tl.id = tp.lesson_id 
  AND tl.module_id = 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f'
WHERE NOT EXISTS (
  SELECT 1 FROM certificates c 
  WHERE c.user_id = p.user_id 
  AND c.module_id = 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f'
)
AND NOT EXISTS (
  SELECT 1 FROM user_notifications un 
  WHERE un.user_id = p.user_id 
  AND un.notification_type = 'training_new_lessons'
  AND un.metadata->>'module_id' = 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f'
);