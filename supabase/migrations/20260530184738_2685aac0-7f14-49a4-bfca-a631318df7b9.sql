
-- 1) Ticket templates per event
CREATE TABLE public.event_ticket_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE REFERENCES public.paid_events(id) ON DELETE CASCADE,
  background_url TEXT,
  page_format TEXT NOT NULL DEFAULT 'A5',
  orientation TEXT NOT NULL DEFAULT 'landscape',
  width_px INTEGER NOT NULL DEFAULT 1240,
  height_px INTEGER NOT NULL DEFAULT 874,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_ticket_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_ticket_templates TO authenticated;
GRANT ALL ON public.event_ticket_templates TO service_role;

ALTER TABLE public.event_ticket_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket templates readable by everyone"
  ON public.event_ticket_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins manage ticket templates"
  ON public.event_ticket_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_event_ticket_templates_updated_at
  BEFORE UPDATE ON public.event_ticket_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Order payment metadata + ticket PDF
ALTER TABLE public.paid_event_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payu_blik_auth_code TEXT,
  ADD COLUMN IF NOT EXISTS ticket_pdf_url TEXT;

ALTER TABLE public.paid_event_order_attendees
  ADD COLUMN IF NOT EXISTS ticket_pdf_url TEXT;
