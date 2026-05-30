
-- PayU settings (singleton)
CREATE TABLE public.payu_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pos_id TEXT,
  client_id TEXT,
  client_secret TEXT,
  md5_key TEXT,
  second_md5_key TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only authenticated admins can read/write; service_role for edge functions.
-- NO anon grant — secrets must never leak.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payu_settings TO authenticated;
GRANT ALL ON public.payu_settings TO service_role;

ALTER TABLE public.payu_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read payu settings"
  ON public.payu_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage payu settings"
  ON public.payu_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payu_settings_updated_at
  BEFORE UPDATE ON public.payu_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed one empty row so admin form always has something to update
INSERT INTO public.payu_settings (environment, is_enabled) VALUES ('sandbox', false);

-- Make event-tickets bucket public for reads (background images + generated PDFs)
UPDATE storage.buckets SET public = true WHERE id = 'event-tickets';

-- Admins manage template backgrounds (templates/* folder)
CREATE POLICY "Admins upload event ticket templates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-tickets'
    AND (storage.foldername(name))[1] = 'templates'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update event ticket templates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-tickets'
    AND (storage.foldername(name))[1] = 'templates'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete event ticket templates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-tickets'
    AND (storage.foldername(name))[1] = 'templates'
    AND public.has_role(auth.uid(), 'admin')
  );
