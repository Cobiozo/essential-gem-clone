
CREATE TABLE IF NOT EXISTS public.missing_join_link_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  occurrence_datetime timestamptz NULL,
  recipient_email text NOT NULL,
  recipient_name text NULL,
  event_title text NULL,
  reason text NOT NULL CHECK (reason IN ('no_link','send_failed')),
  resolved_at timestamptz NULL,
  resolved_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS missing_join_link_alerts_uniq
  ON public.missing_join_link_alerts (event_id, COALESCE(occurrence_datetime, 'epoch'::timestamptz), recipient_email, reason)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS missing_join_link_alerts_event_idx
  ON public.missing_join_link_alerts (event_id, resolved_at);

GRANT SELECT, UPDATE ON public.missing_join_link_alerts TO authenticated;
GRANT ALL ON public.missing_join_link_alerts TO service_role;

ALTER TABLE public.missing_join_link_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts" ON public.missing_join_link_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can resolve alerts" ON public.missing_join_link_alerts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages alerts" ON public.missing_join_link_alerts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_missing_join_link_alerts_updated_at
  BEFORE UPDATE ON public.missing_join_link_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
