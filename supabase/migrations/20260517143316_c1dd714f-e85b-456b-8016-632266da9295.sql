CREATE TABLE public.mobile_bottom_nav_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  target_path TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  visible_to_client BOOLEAN NOT NULL DEFAULT true,
  visible_to_partner BOOLEAN NOT NULL DEFAULT true,
  visible_to_specjalista BOOLEAN NOT NULL DEFAULT true,
  visible_to_leader BOOLEAN NOT NULL DEFAULT true,
  visible_to_admin BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mobile_bottom_nav_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read bottom nav"
  ON public.mobile_bottom_nav_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert bottom nav"
  ON public.mobile_bottom_nav_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bottom nav"
  ON public.mobile_bottom_nav_items
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bottom nav"
  ON public.mobile_bottom_nav_items
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mobile_bottom_nav_updated_at
  BEFORE UPDATE ON public.mobile_bottom_nav_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.mobile_bottom_nav_items (label, icon_name, target_path, position) VALUES
  ('Pulpit', 'LayoutDashboard', '/dashboard', 0),
  ('Wiadomości', 'MessageCircle', '/messages', 1),
  ('Eventy', 'Calendar', '/webinars', 2),
  ('Akademia', 'GraduationCap', '/healthy-knowledge', 3),
  ('Profil', 'User', '/profile', 4);