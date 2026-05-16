
CREATE TABLE public.dashboard_map_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  visible_to_client boolean NOT NULL DEFAULT true,
  visible_to_partner boolean NOT NULL DEFAULT true,
  visible_to_specjalista boolean NOT NULL DEFAULT true,
  visible_to_leader boolean NOT NULL DEFAULT true,
  visible_to_admin boolean NOT NULL DEFAULT true,
  width text NOT NULL DEFAULT 'full' CHECK (width IN ('full','two_thirds','half')),
  height_px integer NOT NULL DEFAULT 420 CHECK (height_px BETWEEN 300 AND 800),
  default_mode text NOT NULL DEFAULT 'classic' CHECK (default_mode IN ('classic','satellite')),
  marker_color text NOT NULL DEFAULT '#ef4444',
  show_logos boolean NOT NULL DEFAULT true,
  show_title boolean NOT NULL DEFAULT true,
  title text NOT NULL DEFAULT 'Mapa świata użytkowników',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.dashboard_map_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read map settings"
  ON public.dashboard_map_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert map settings"
  ON public.dashboard_map_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update map settings"
  ON public.dashboard_map_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dashboard_map_settings_updated
  BEFORE UPDATE ON public.dashboard_map_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.dashboard_map_settings (id) VALUES (gen_random_uuid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_map_settings;
