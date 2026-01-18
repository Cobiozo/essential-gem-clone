-- Table for meeting type settings (title, description, image per type)
CREATE TABLE public.leader_meeting_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_type text NOT NULL CHECK (meeting_type IN ('tripartite', 'consultation')),
  title text,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(leader_user_id, meeting_type)
);

-- Enable RLS
ALTER TABLE public.leader_meeting_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings (needed for booking flow)
CREATE POLICY "Users can view all meeting settings"
  ON public.leader_meeting_settings FOR SELECT
  TO authenticated USING (true);

-- Leaders can insert their own settings
CREATE POLICY "Leaders can insert own settings"
  ON public.leader_meeting_settings FOR INSERT
  TO authenticated WITH CHECK (leader_user_id = auth.uid());

-- Leaders can update their own settings
CREATE POLICY "Leaders can update own settings"
  ON public.leader_meeting_settings FOR UPDATE
  TO authenticated USING (leader_user_id = auth.uid());

-- Leaders can delete their own settings
CREATE POLICY "Leaders can delete own settings"
  ON public.leader_meeting_settings FOR DELETE
  TO authenticated USING (leader_user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_leader_meeting_settings_updated_at
  BEFORE UPDATE ON public.leader_meeting_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();