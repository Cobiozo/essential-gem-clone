
CREATE TABLE public.event_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('immediate','scheduled')),
  scheduled_at timestamptz NOT NULL,
  label text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed')),
  sent_at timestamptz,
  recipients_count integer NOT NULL DEFAULT 0,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_email_campaigns_event ON public.event_email_campaigns(event_id);
CREATE INDEX idx_event_email_campaigns_due ON public.event_email_campaigns(status, scheduled_at) WHERE status = 'pending';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_email_campaigns TO authenticated;
GRANT ALL ON public.event_email_campaigns TO service_role;
ALTER TABLE public.event_email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage event email campaigns"
  ON public.event_email_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.event_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  campaign_id uuid REFERENCES public.event_email_campaigns(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX idx_event_email_recipients_event ON public.event_email_recipients(event_id);
GRANT SELECT ON public.event_email_recipients TO authenticated;
GRANT ALL ON public.event_email_recipients TO service_role;
ALTER TABLE public.event_email_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read event email recipients"
  ON public.event_email_recipients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_event_email_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_event_email_campaigns_updated_at
BEFORE UPDATE ON public.event_email_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_event_email_campaigns_updated_at();
