
-- Soft-delete fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_status text;

-- Audit log table for account deletions
CREATE TABLE IF NOT EXISTS public.account_deletion_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email_snapshot text,
  full_name_snapshot text,
  roles_snapshot jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz,
  final_action text,
  acted_by uuid,
  acted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.account_deletion_log TO authenticated;
GRANT ALL ON public.account_deletion_log TO service_role;

ALTER TABLE public.account_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view account deletion log"
ON public.account_deletion_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages account deletion log"
ON public.account_deletion_log
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_account_deletion_log_user ON public.account_deletion_log(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_log_action ON public.account_deletion_log(final_action);
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_status ON public.profiles(deletion_status) WHERE deletion_status IS NOT NULL;
