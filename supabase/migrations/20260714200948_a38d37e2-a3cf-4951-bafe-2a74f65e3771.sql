
-- 1. Add retry tracking fields to missing_join_link_alerts
ALTER TABLE public.missing_join_link_alerts
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_missing_join_link_alerts_retry
  ON public.missing_join_link_alerts (next_retry_at)
  WHERE resolved_at IS NULL;

-- 2. New audit table for retry attempts
CREATE TABLE IF NOT EXISTS public.join_link_retry_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.missing_join_link_alerts(id) ON DELETE CASCADE,
  attempt_no integer NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL, -- 'sent' | 'smtp_error' | 'no_link' | 'manual_resend' | 'max_attempts_exhausted'
  error_message text,
  triggered_by text NOT NULL DEFAULT 'cron', -- 'cron' | 'admin:<uuid>'
  zoom_link_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.join_link_retry_log TO authenticated;
GRANT ALL ON public.join_link_retry_log TO service_role;

ALTER TABLE public.join_link_retry_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view retry logs"
  ON public.join_link_retry_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages retry logs"
  ON public.join_link_retry_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_join_link_retry_log_alert ON public.join_link_retry_log (alert_id, attempted_at DESC);
