-- Add user_registration event type to notification system linked to activation_email template
INSERT INTO public.notification_event_types (
  event_key, 
  name, 
  description, 
  source_module, 
  icon_name,
  color,
  is_active, 
  send_email, 
  email_template_id,
  position
)
SELECT 
  'user_registration', 
  'Rejestracja użytkownika', 
  'Nowy użytkownik zarejestrował się w systemie - wysyłka emaila aktywacyjnego',
  'registration',
  'UserPlus',
  '#22c55e',
  true,
  true,
  et.id,
  (SELECT COALESCE(MAX(position), 0) + 1 FROM public.notification_event_types)
FROM public.email_templates et 
WHERE et.internal_name = 'activation_email'
ON CONFLICT (event_key) DO UPDATE SET
  send_email = true,
  email_template_id = EXCLUDED.email_template_id;