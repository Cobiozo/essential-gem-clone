
-- Table for meeting room settings (permissions, co-hosts)
CREATE TABLE public.meeting_room_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL UNIQUE,
  host_user_id uuid NOT NULL,
  allow_chat boolean NOT NULL DEFAULT true,
  allow_microphone boolean NOT NULL DEFAULT true,
  allow_camera boolean NOT NULL DEFAULT true,
  allow_screen_share text NOT NULL DEFAULT 'host_only',
  allowed_screen_share_users uuid[] DEFAULT '{}',
  co_host_user_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_room_settings ENABLE ROW LEVEL SECURITY;

-- Participants in the room can read settings
CREATE POLICY "Participants can read meeting settings"
ON public.meeting_room_settings
FOR SELECT
TO authenticated
USING (
  room_id IN (SELECT public.get_user_meeting_rooms(auth.uid()))
  OR host_user_id = auth.uid()
);

-- Host can insert settings
CREATE POLICY "Host can create meeting settings"
ON public.meeting_room_settings
FOR INSERT
TO authenticated
WITH CHECK (host_user_id = auth.uid());

-- Host or co-hosts can update settings
CREATE POLICY "Host or co-host can update meeting settings"
ON public.meeting_room_settings
FOR UPDATE
TO authenticated
USING (
  host_user_id = auth.uid()
  OR auth.uid() = ANY(co_host_user_ids)
);

-- Host can delete settings
CREATE POLICY "Host can delete meeting settings"
ON public.meeting_room_settings
FOR DELETE
TO authenticated
USING (host_user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_meeting_room_settings_updated_at
BEFORE UPDATE ON public.meeting_room_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
