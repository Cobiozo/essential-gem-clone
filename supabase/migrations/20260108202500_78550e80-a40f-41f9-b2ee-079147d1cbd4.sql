-- Create cron_settings table
CREATE TABLE IF NOT EXISTS public.cron_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT UNIQUE NOT NULL,
  interval_minutes INT NOT NULL DEFAULT 180,
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default entry for process-pending-notifications
INSERT INTO public.cron_settings (job_name, interval_minutes)
VALUES ('process-pending-notifications', 180)
ON CONFLICT (job_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.cron_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage cron_settings
CREATE POLICY "Admins can view cron_settings"
  ON public.cron_settings
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update cron_settings"
  ON public.cron_settings
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can insert cron_settings"
  ON public.cron_settings
  FOR INSERT
  WITH CHECK (public.is_admin());