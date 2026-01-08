-- Tabela do śledzenia wykonań cron jobów
CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  processed_count INT DEFAULT 0,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON public.cron_job_logs(job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON public.cron_job_logs(status, started_at DESC);

-- RLS dla cron_job_logs (tylko admini mogą widzieć)
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron logs"
ON public.cron_job_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- Funkcja do znajdowania użytkowników bez welcome email
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

-- Funkcja do znajdowania emaili do ponowienia (max 3 próby)
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

-- Funkcja do znajdowania szkoleń bez wysłanego powiadomienia
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