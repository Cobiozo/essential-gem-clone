-- Wyślij jednorazowe powiadomienie do użytkowników z certyfikatami którzy mają nowe lekcje
INSERT INTO user_notifications (
  user_id, 
  notification_type, 
  source_module, 
  title, 
  message, 
  link, 
  metadata
)
SELECT DISTINCT
  c.user_id,
  'training_new_lessons',
  'training',
  'Nowe materiały szkoleniowe',
  'Do modułu SPRZEDAŻOWE zostały dodane nowe lekcje. Twój certyfikat pozostaje ważny, ale zachęcamy do zapoznania się z nowymi materiałami.',
  '/training/c6ab5d58-d77e-43e8-b246-a5e15c0f836f',
  jsonb_build_object(
    'module_id', c.module_id,
    'module_title', 'SPRZEDAŻOWE',
    'new_lessons_count', 3,
    'certificate_valid', true
  )
FROM certificates c
WHERE c.module_id = 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f'
AND EXISTS (
  SELECT 1 FROM training_lessons tl 
  WHERE tl.module_id = c.module_id 
  AND tl.is_active = true 
  AND tl.created_at > c.issued_at
);