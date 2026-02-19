-- Fix get_users_without_welcome_email: remove email_activated requirement
-- Welcome emails should be sent to ALL new users immediately after registration
CREATE OR REPLACE FUNCTION public.get_users_without_welcome_email()
 RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.email, p.first_name, p.last_name, p.role
  FROM profiles p
  WHERE p.is_active = true
  AND p.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM email_logs el 
    WHERE el.recipient_user_id = p.user_id 
    AND (el.subject ILIKE '%Witamy%' OR el.subject ILIKE '%Welcome%' OR el.subject ILIKE '%rejestracja%' OR el.subject ILIKE '%Potwierdzenie%')
    AND el.status = 'sent'
  )
  AND NOT EXISTS (
    SELECT 1 FROM email_logs el
    WHERE el.recipient_user_id = p.user_id
    AND el.metadata->>'type' = 'welcome_registration'
    AND el.status = 'sent'
  )
  AND p.created_at > NOW() - INTERVAL '30 days'
  ORDER BY p.created_at ASC
  LIMIT 50;
END;
$function$;