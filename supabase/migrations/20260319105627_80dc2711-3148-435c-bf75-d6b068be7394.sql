
-- Gallery table for independent templates
CREATE TABLE public.partner_page_templates_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_templates_gallery_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_templates_gallery_updated_at_trigger
  BEFORE UPDATE ON public.partner_page_templates_gallery
  FOR EACH ROW EXECUTE FUNCTION public.update_templates_gallery_updated_at();

-- RLS
ALTER TABLE public.partner_page_templates_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active templates"
  ON public.partner_page_templates_gallery FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON public.partner_page_templates_gallery FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Link partner_pages to selected template
ALTER TABLE public.partner_pages
  ADD COLUMN selected_template_id UUID REFERENCES public.partner_page_templates_gallery(id);
