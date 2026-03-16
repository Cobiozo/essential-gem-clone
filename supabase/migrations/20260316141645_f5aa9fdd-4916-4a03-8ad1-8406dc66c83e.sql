ALTER TABLE public.login_audit_log 
  ADD COLUMN IF NOT EXISTS login_status text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS failure_reason text;