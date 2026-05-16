-- App banners: multi-banner configurable system
CREATE TABLE IF NOT EXISTS public.app_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  button_label text NOT NULL DEFAULT 'Przejdź',
  severity text NOT NULL DEFAULT 'info',
  dismissible boolean NOT NULL DEFAULT true,
  style_variant text NOT NULL DEFAULT 'soft',
  accent_color text,
  icon_name text NOT NULL DEFAULT 'Info',
  target_url text NOT NULL DEFAULT '/dashboard',
  open_in_new_tab boolean NOT NULL DEFAULT false,
  audience_type text NOT NULL DEFAULT 'all',
  required_fields text[] NOT NULL DEFAULT '{}',
  target_roles text[] NOT NULL DEFAULT '{}',
  target_user_ids uuid[] NOT NULL DEFAULT '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  hide_on_paths text[] NOT NULL DEFAULT '{/auth,/reset-password,/change-password,/install}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_banners_severity_check CHECK (severity IN ('info','warning','destructive','success')),
  CONSTRAINT app_banners_style_check CHECK (style_variant IN ('soft','solid','outline','gradient')),
  CONSTRAINT app_banners_audience_check CHECK (audience_type IN ('all','missing_profile_fields','role','specific_users'))
);

ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read banners"
  ON public.app_banners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert banners"
  ON public.app_banners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banners"
  ON public.app_banners FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banners"
  ON public.app_banners FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_app_banners_updated_at
  BEFORE UPDATE ON public.app_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_app_banners_enabled_priority ON public.app_banners(enabled, priority DESC);

-- Seed from existing profile_completion_banner_config (if present)
INSERT INTO public.app_banners (
  enabled, priority, title, message, button_label, severity, dismissible,
  style_variant, icon_name, target_url, audience_type, required_fields
)
SELECT
  COALESCE(c.enabled, true),
  100,
  COALESCE(NULLIF(c.title,''), 'Uzupełnij swoje dane'),
  COALESCE(NULLIF(c.message,''), 'Aby w pełni korzystać z platformy, uzupełnij brakujące dane w swoim profilu.'),
  COALESCE(NULLIF(c.button_label,''), 'Uzupełnij dane'),
  COALESCE(c.severity, 'warning'),
  COALESCE(c.dismissible, false),
  'soft',
  CASE COALESCE(c.severity, 'warning')
    WHEN 'destructive' THEN 'AlertCircle'
    WHEN 'warning' THEN 'AlertTriangle'
    ELSE 'Info'
  END,
  COALESCE(NULLIF(c.target_path,''), '/my-account'),
  'missing_profile_fields',
  COALESCE(c.required_fields, ARRAY['first_name','last_name','phone_number']::text[])
FROM public.profile_completion_banner_config c
WHERE NOT EXISTS (SELECT 1 FROM public.app_banners);

-- If no existing config at all, seed a default disabled example
INSERT INTO public.app_banners (
  enabled, priority, title, message, button_label, severity,
  style_variant, icon_name, target_url, audience_type, required_fields
)
SELECT
  false, 100, 'Uzupełnij swoje dane',
  'Aby w pełni korzystać z platformy, uzupełnij brakujące dane w swoim profilu.',
  'Uzupełnij dane', 'warning', 'soft', 'AlertTriangle',
  '/my-account', 'missing_profile_fields',
  ARRAY['first_name','last_name','phone_number']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.app_banners);
