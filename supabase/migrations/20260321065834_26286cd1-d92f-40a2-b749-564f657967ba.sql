
-- PureBox settings table
CREATE TABLE public.purebox_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_key text UNIQUE NOT NULL,
  element_name text NOT NULL,
  is_active boolean DEFAULT true,
  visible_to_admin boolean DEFAULT true,
  visible_to_partner boolean DEFAULT true,
  visible_to_client boolean DEFAULT true,
  visible_to_specjalista boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.purebox_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage purebox_settings"
  ON public.purebox_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PureBox user access table
CREATE TABLE public.purebox_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  element_key text NOT NULL,
  is_enabled boolean DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, element_key)
);

ALTER TABLE public.purebox_user_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage purebox_user_access"
  ON public.purebox_user_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed initial elements
INSERT INTO public.purebox_settings (element_key, element_name) VALUES
  ('skills-assessment', 'Ocena umiejętności'),
  ('moje-testy', 'Moje Testy');
