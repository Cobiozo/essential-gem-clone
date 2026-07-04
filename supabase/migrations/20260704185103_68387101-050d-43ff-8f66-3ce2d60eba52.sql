ALTER TABLE public.event_email_campaigns
  ADD COLUMN IF NOT EXISTS target_roles text[] NOT NULL DEFAULT ARRAY['admin','partner','client','specjalista']::text[];

DROP POLICY IF EXISTS "Admins delete event email recipients" ON public.event_email_recipients;
CREATE POLICY "Admins delete event email recipients"
  ON public.event_email_recipients
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));