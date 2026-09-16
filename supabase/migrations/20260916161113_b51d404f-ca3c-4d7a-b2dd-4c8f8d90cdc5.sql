CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_user_id
  ON public.email_logs (recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

ANALYZE public.email_logs;