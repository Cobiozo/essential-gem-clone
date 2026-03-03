
-- Jednorazowe uzupełnienie brakujących przypisań dla wszystkich użytkowników
INSERT INTO public.training_assignments (user_id, module_id, assigned_by, notification_sent)
SELECT 
  ur.user_id,
  tm.id,
  NULL,
  false
FROM public.user_roles ur
CROSS JOIN public.training_modules tm
WHERE tm.is_active = true
  AND (
    (ur.role = 'partner' AND tm.visible_to_partners = true) OR
    (ur.role = 'specjalista' AND tm.visible_to_specjalista = true) OR
    (ur.role IN ('client', 'user') AND tm.visible_to_clients = true) OR
    (ur.role = 'admin') OR
    tm.visible_to_everyone = true
  )
ON CONFLICT (user_id, module_id) DO NOTHING;
