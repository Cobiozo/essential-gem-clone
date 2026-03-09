
-- Table for tracking invitation link clicks
CREATE TABLE public.auto_webinar_invitation_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  ref_code TEXT NOT NULL,
  tracking_code TEXT NOT NULL,
  visitor_ip TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_auto_webinar_clicks_event_id ON public.auto_webinar_invitation_clicks(event_id);
CREATE INDEX idx_auto_webinar_clicks_ref_code ON public.auto_webinar_invitation_clicks(ref_code);

-- RLS
ALTER TABLE public.auto_webinar_invitation_clicks ENABLE ROW LEVEL SECURITY;

-- Anon can insert (log clicks without auth)
CREATE POLICY "Anyone can log invitation clicks"
  ON public.auto_webinar_invitation_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated can read
CREATE POLICY "Authenticated users can view invitation clicks"
  ON public.auto_webinar_invitation_clicks
  FOR SELECT
  TO authenticated
  USING (true);
