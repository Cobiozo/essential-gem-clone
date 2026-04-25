CREATE TABLE public.paid_events_visibility_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('allowed','denied')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT paid_events_visibility_overrides_user_unique UNIQUE (user_id)
);

CREATE INDEX idx_paid_events_visibility_overrides_user_id
  ON public.paid_events_visibility_overrides(user_id);

ALTER TABLE public.paid_events_visibility_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage paid events visibility overrides"
ON public.paid_events_visibility_overrides
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own paid events override"
ON public.paid_events_visibility_overrides
FOR SELECT
TO authenticated
USING (user_id = auth.uid());