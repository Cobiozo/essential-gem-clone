-- Fix get_users_without_welcome_email function
CREATE OR REPLACE FUNCTION public.get_users_without_welcome_email()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.email, p.first_name, p.last_name, p.role
  FROM profiles p
  WHERE p.email_activated = true
  AND p.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM email_logs el 
    WHERE el.recipient_user_id = p.user_id 
    AND el.email_type = 'welcome'
    AND el.status = 'sent'
  )
  AND p.created_at > NOW() - INTERVAL '30 days'
  ORDER BY p.created_at ASC
  LIMIT 50;
END;
$$;

-- Fix get_retryable_failed_emails function
CREATE OR REPLACE FUNCTION public.get_retryable_failed_emails()
RETURNS TABLE (
  id UUID,
  recipient_user_id UUID,
  recipient_email TEXT,
  subject TEXT,
  template_id UUID,
  email_type TEXT,
  metadata JSONB,
  retry_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.id, 
    el.recipient_user_id, 
    el.recipient_email, 
    el.subject, 
    el.template_id,
    el.email_type,
    el.metadata,
    COALESCE((el.metadata->>'retry_count')::INT, 0) AS retry_count
  FROM email_logs el
  WHERE el.status = 'failed'
  AND el.created_at > NOW() - INTERVAL '7 days'
  AND COALESCE((el.metadata->>'retry_count')::INT, 0) < 3
  ORDER BY el.created_at ASC
  LIMIT 30;
END;
$$;

-- Fix get_training_assignments_without_notification function
CREATE OR REPLACE FUNCTION public.get_training_assignments_without_notification()
RETURNS TABLE (
  assignment_id UUID,
  user_id UUID,
  module_id UUID,
  user_email TEXT,
  user_first_name TEXT,
  module_title TEXT,
  assigned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.id AS assignment_id,
    ta.user_id,
    ta.module_id,
    p.email AS user_email,
    p.first_name AS user_first_name,
    tm.title AS module_title,
    ta.assigned_at
  FROM training_user_progress ta
  JOIN profiles p ON p.user_id = ta.user_id
  JOIN training_modules tm ON tm.id = ta.module_id
  WHERE ta.notification_sent = false
  AND p.email_activated = true
  AND p.status = 'active'
  AND ta.assigned_at > NOW() - INTERVAL '7 days'
  ORDER BY ta.assigned_at ASC
  LIMIT 50;
END;
$$;