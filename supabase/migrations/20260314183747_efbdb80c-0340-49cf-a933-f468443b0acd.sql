
-- Add device parsing columns to login_audit_log
ALTER TABLE public.login_audit_log 
  ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS os_name TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS browser_name TEXT DEFAULT 'unknown';

-- Create user_activity_log table
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}'::jsonb,
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action_type ON public.user_activity_log(action_type);

-- Index for device_type queries on login_audit_log
CREATE INDEX IF NOT EXISTS idx_login_audit_log_device_type ON public.login_audit_log(device_type);

-- RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all activity
CREATE POLICY "Admins can read all activity"
  ON public.user_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can read their own activity
CREATE POLICY "Users can read own activity"
  ON public.user_activity_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can insert their own activity
CREATE POLICY "Users can insert own activity"
  ON public.user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
