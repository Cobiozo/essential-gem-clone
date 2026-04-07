
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON public.admin_activity_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert activity logs"
  ON public.admin_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log(created_at DESC);
CREATE INDEX idx_admin_activity_log_admin_user_id ON public.admin_activity_log(admin_user_id);
CREATE INDEX idx_admin_activity_log_action_type ON public.admin_activity_log(action_type);
