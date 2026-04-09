
-- Table for editable PureBox content (assessment questions, omega thresholds, etc.)
CREATE TABLE public.purebox_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text UNIQUE NOT NULL,
  content_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.purebox_content ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read content
CREATE POLICY "Authenticated users can read purebox content"
  ON public.purebox_content FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert purebox content"
  ON public.purebox_content FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update purebox content"
  ON public.purebox_content FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp
CREATE TRIGGER update_purebox_content_updated_at
  BEFORE UPDATE ON public.purebox_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_preferences_updated_at();
