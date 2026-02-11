
-- ============================================
-- Partner Pages System - Database Schema
-- ============================================

-- 1. partner_page_settings (singleton - global settings & access control)
CREATE TABLE public.partner_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_system_active BOOLEAN NOT NULL DEFAULT false,
  enabled_for_partner BOOLEAN NOT NULL DEFAULT false,
  enabled_for_specjalista BOOLEAN NOT NULL DEFAULT false,
  enabled_for_client BOOLEAN NOT NULL DEFAULT false,
  enabled_for_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read partner_page_settings"
  ON public.partner_page_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can update partner_page_settings"
  ON public.partner_page_settings FOR UPDATE
  TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can insert partner_page_settings"
  ON public.partner_page_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

-- Insert default singleton row
INSERT INTO public.partner_page_settings (is_system_active) VALUES (false);

-- Trigger for updated_at
CREATE TRIGGER update_partner_page_settings_updated_at
  BEFORE UPDATE ON public.partner_page_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. partner_page_user_access (individual user access)
CREATE TABLE public.partner_page_user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.partner_page_user_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage partner_page_user_access"
  ON public.partner_page_user_access FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users can read own access"
  ON public.partner_page_user_access FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- 3. partner_page_template (admin-defined template)
CREATE TABLE public.partner_page_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_page_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read partner_page_template"
  ON public.partner_page_template FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage partner_page_template"
  ON public.partner_page_template FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Insert default empty template
INSERT INTO public.partner_page_template (template_data) VALUES ('[]'::jsonb);

CREATE TRIGGER update_partner_page_template_updated_at
  BEFORE UPDATE ON public.partner_page_template
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. product_catalog (admin-managed products)
CREATE TABLE public.product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active products"
  ON public.product_catalog FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product_catalog"
  ON public.product_catalog FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_product_catalog_updated_at
  BEFORE UPDATE ON public.product_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. partner_pages (individual partner data)
CREATE TABLE public.partner_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  custom_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.partner_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active partner_pages"
  ON public.partner_pages FOR SELECT
  USING (is_active = true OR auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Owner can insert own partner_page"
  ON public.partner_pages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own partner_page"
  ON public.partner_pages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE TRIGGER update_partner_pages_updated_at
  BEFORE UPDATE ON public.partner_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. partner_product_links (partner's product selections with purchase URLs)
CREATE TABLE public.partner_product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_page_id UUID NOT NULL REFERENCES public.partner_pages(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.product_catalog(id) ON DELETE CASCADE,
  purchase_url TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_page_id, product_id)
);

ALTER TABLE public.partner_product_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active partner_product_links"
  ON public.partner_product_links FOR SELECT
  USING (true);

CREATE POLICY "Owner can manage own product_links"
  ON public.partner_product_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_pages pp 
      WHERE pp.id = partner_page_id 
      AND (pp.user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_pages pp 
      WHERE pp.id = partner_page_id 
      AND (pp.user_id = auth.uid() OR public.is_admin())
    )
  );
