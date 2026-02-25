-- Add updated_at column to meeting_room_participants for heartbeat tracking
ALTER TABLE public.meeting_room_participants 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_meeting_participant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_meeting_room_participants_updated_at
  BEFORE UPDATE ON public.meeting_room_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meeting_participant_updated_at();