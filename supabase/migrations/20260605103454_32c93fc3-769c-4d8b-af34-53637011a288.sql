
CREATE TABLE IF NOT EXISTS public.sidebar_menu_order (
  id boolean PRIMARY KEY DEFAULT true,
  "order" jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sidebar_menu_order_single CHECK (id = true)
);

GRANT SELECT ON public.sidebar_menu_order TO anon, authenticated;
GRANT INSERT, UPDATE ON public.sidebar_menu_order TO authenticated;
GRANT ALL ON public.sidebar_menu_order TO service_role;

ALTER TABLE public.sidebar_menu_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sidebar_menu_order_select_all"
  ON public.sidebar_menu_order FOR SELECT
  USING (true);

CREATE POLICY "sidebar_menu_order_admin_insert"
  ON public.sidebar_menu_order FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "sidebar_menu_order_admin_update"
  ON public.sidebar_menu_order FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.sidebar_menu_order (id, "order")
VALUES (true, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
