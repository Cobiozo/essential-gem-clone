
-- Add internal meeting columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS use_internal_meeting boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS meeting_room_id text;

-- Create index on meeting_room_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_events_meeting_room_id ON public.events(meeting_room_id) WHERE meeting_room_id IS NOT NULL;

-- Create meeting_room_participants table
CREATE TABLE IF NOT EXISTS public.meeting_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  user_id uuid NOT NULL,
  peer_id text,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for room lookups
CREATE INDEX idx_meeting_room_participants_room_id ON public.meeting_room_participants(room_id) WHERE is_active = true;
CREATE INDEX idx_meeting_room_participants_user_id ON public.meeting_room_participants(user_id);

-- Enable RLS
ALTER TABLE public.meeting_room_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies: participants can see others in same room
CREATE POLICY "Users can view participants in their room"
ON public.meeting_room_participants
FOR SELECT
TO authenticated
USING (
  room_id IN (
    SELECT mrp.room_id FROM public.meeting_room_participants mrp 
    WHERE mrp.user_id = auth.uid() AND mrp.is_active = true
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Users can insert their own participant record
CREATE POLICY "Users can join a room"
ON public.meeting_room_participants
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own record (leave, update peer_id)
CREATE POLICY "Users can update their own participation"
ON public.meeting_room_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Admins can delete any participant
CREATE POLICY "Admins can manage participants"
ON public.meeting_room_participants
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
