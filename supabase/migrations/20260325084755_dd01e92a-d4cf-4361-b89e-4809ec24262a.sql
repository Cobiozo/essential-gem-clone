-- Faza 1: RLS for anon on auto_webinar_config and auto_webinar_videos
CREATE POLICY "anon_select_auto_webinar_config"
ON public.auto_webinar_config
FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon_select_auto_webinar_videos"
ON public.auto_webinar_videos
FOR SELECT
TO anon
USING (true);

-- Faza 3: Analytics table
CREATE TABLE public.auto_webinar_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  video_id uuid REFERENCES public.auto_webinar_videos(id) ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL DEFAULT gen_random_uuid()::text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  watch_duration_seconds integer DEFAULT 0,
  is_guest boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_webinar_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_insert_views"
ON public.auto_webinar_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "anyone_update_own_views"
ON public.auto_webinar_views
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "admins_select_views"
ON public.auto_webinar_views
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));