
CREATE TABLE public.leader_zoom_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  zoom_url text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leader_zoom_links_user_id ON public.leader_zoom_links(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leader_zoom_links TO authenticated;
GRANT ALL ON public.leader_zoom_links TO service_role;

ALTER TABLE public.leader_zoom_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own zoom links"
  ON public.leader_zoom_links
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all zoom links"
  ON public.leader_zoom_links
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_leader_zoom_links_updated_at
  BEFORE UPDATE ON public.leader_zoom_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
