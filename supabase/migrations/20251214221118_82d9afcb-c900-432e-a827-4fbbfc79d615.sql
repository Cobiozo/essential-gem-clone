-- Tabela ustawień widoczności przycisku Reflinki per rola
CREATE TABLE public.reflinks_visibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE,
  button_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Włączenie RLS
ALTER TABLE public.reflinks_visibility_settings ENABLE ROW LEVEL SECURITY;

-- Polityki RLS
CREATE POLICY "Admins can manage reflinks visibility"
  ON public.reflinks_visibility_settings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can view visibility settings"
  ON public.reflinks_visibility_settings
  FOR SELECT
  USING (true);

-- Domyślne wartości (wszystkie role wyłączone)
INSERT INTO public.reflinks_visibility_settings (role, button_visible)
VALUES 
  ('client', false),
  ('partner', false),
  ('specjalista', false);