
CREATE TABLE public.partner_page_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cta_key TEXT NOT NULL UNIQUE,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  submit_text TEXT NOT NULL DEFAULT 'Wyślij',
  success_message TEXT NOT NULL DEFAULT 'Dziękujemy! Formularz został wysłany.',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_page_forms ENABLE ROW LEVEL SECURITY;

-- Everyone can read active forms (needed for anonymous partner pages)
CREATE POLICY "Anyone can read active forms"
  ON public.partner_page_forms
  FOR SELECT
  USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage forms"
  ON public.partner_page_forms
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
