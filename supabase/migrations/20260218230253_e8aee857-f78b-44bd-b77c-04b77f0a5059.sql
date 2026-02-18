
-- 1. New table: meeting_guest_tokens
CREATE TABLE public.meeting_guest_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  inviter_user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, email)
);

CREATE INDEX idx_meeting_guest_tokens_room ON public.meeting_guest_tokens(room_id);
CREATE INDEX idx_meeting_guest_tokens_token ON public.meeting_guest_tokens(token);
CREATE INDEX idx_meeting_guest_tokens_inviter ON public.meeting_guest_tokens(inviter_user_id);

ALTER TABLE public.meeting_guest_tokens ENABLE ROW LEVEL SECURITY;

-- Anon can insert (generate token) - controlled by edge function
CREATE POLICY "Anon can insert guest tokens"
ON public.meeting_guest_tokens FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Anon can read own token by token value
CREATE POLICY "Anyone can read guest tokens by token"
ON public.meeting_guest_tokens FOR SELECT TO anon, authenticated
USING (true);

-- Admins and inviters can see their guests
CREATE POLICY "Admins can manage guest tokens"
ON public.meeting_guest_tokens FOR ALL TO authenticated
USING (public.is_admin() OR inviter_user_id = auth.uid());

-- Anon can update used_at
CREATE POLICY "Anon can update guest token used_at"
ON public.meeting_guest_tokens FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. New table: meeting_guest_analytics
CREATE TABLE public.meeting_guest_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_token_id uuid NOT NULL REFERENCES public.meeting_guest_tokens(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  room_id text NOT NULL,
  inviter_user_id uuid NOT NULL,
  joined_at timestamptz,
  left_at timestamptz,
  duration_seconds integer,
  join_source text,
  device_info text,
  thank_you_email_sent boolean NOT NULL DEFAULT false,
  thank_you_email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_guest_analytics_event ON public.meeting_guest_analytics(event_id);
CREATE INDEX idx_meeting_guest_analytics_inviter ON public.meeting_guest_analytics(inviter_user_id);
CREATE INDEX idx_meeting_guest_analytics_guest_token ON public.meeting_guest_analytics(guest_token_id);

ALTER TABLE public.meeting_guest_analytics ENABLE ROW LEVEL SECURITY;

-- Anon/authenticated can insert analytics
CREATE POLICY "Anyone can insert guest analytics"
ON public.meeting_guest_analytics FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Anon can update own analytics (for left_at, duration)
CREATE POLICY "Anyone can update guest analytics"
ON public.meeting_guest_analytics FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Admins and inviters can read analytics
CREATE POLICY "Admins and inviters can read analytics"
ON public.meeting_guest_analytics FOR SELECT TO authenticated
USING (public.is_admin() OR inviter_user_id = auth.uid());

-- Anon can read own analytics by guest_token_id
CREATE POLICY "Anon can read own analytics"
ON public.meeting_guest_analytics FOR SELECT TO anon
USING (true);

-- 3. Modify meeting_room_participants: make user_id nullable, add guest_token_id
ALTER TABLE public.meeting_room_participants
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.meeting_room_participants
  ADD COLUMN guest_token_id uuid REFERENCES public.meeting_guest_tokens(id) ON DELETE SET NULL;

ALTER TABLE public.meeting_room_participants
  ADD CONSTRAINT meeting_room_participants_user_or_guest 
  CHECK (user_id IS NOT NULL OR guest_token_id IS NOT NULL);

-- Drop the existing unique constraint (room_id, user_id) since user_id can be null now
ALTER TABLE public.meeting_room_participants
  DROP CONSTRAINT IF EXISTS meeting_room_participants_room_user_unique;

-- Recreate unique for registered users only
CREATE UNIQUE INDEX idx_meeting_room_participants_room_user_unique 
  ON public.meeting_room_participants(room_id, user_id) 
  WHERE user_id IS NOT NULL;

-- Unique for guests
CREATE UNIQUE INDEX idx_meeting_room_participants_room_guest_unique 
  ON public.meeting_room_participants(room_id, guest_token_id) 
  WHERE guest_token_id IS NOT NULL;

-- Add RLS for anon guests to participate
DROP POLICY IF EXISTS "Users can join a room" ON public.meeting_room_participants;
CREATE POLICY "Users and guests can join a room"
ON public.meeting_room_participants FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (guest_token_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.meeting_guest_tokens mgt
    WHERE mgt.id = guest_token_id AND mgt.expires_at > now()
  ))
);

DROP POLICY IF EXISTS "Users can update their own participation" ON public.meeting_room_participants;
CREATE POLICY "Users and guests can update participation"
ON public.meeting_room_participants FOR UPDATE TO anon, authenticated
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (guest_token_id IS NOT NULL)
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (guest_token_id IS NOT NULL)
);

-- Update SELECT policy to include anon guests
DROP POLICY IF EXISTS "Users can view participants in their room" ON public.meeting_room_participants;
CREATE POLICY "Users can view participants in their room"
ON public.meeting_room_participants FOR SELECT TO anon, authenticated
USING (true);

-- 4. Modify meeting_chat_messages: make user_id nullable, add guest_token_id
ALTER TABLE public.meeting_chat_messages
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.meeting_chat_messages
  ADD COLUMN guest_token_id uuid REFERENCES public.meeting_guest_tokens(id) ON DELETE SET NULL;

ALTER TABLE public.meeting_chat_messages
  ADD CONSTRAINT meeting_chat_messages_user_or_guest
  CHECK (user_id IS NOT NULL OR guest_token_id IS NOT NULL);

-- Update chat RLS to support guests
DROP POLICY IF EXISTS "Users can read chat in their rooms" ON public.meeting_chat_messages;
CREATE POLICY "Users and guests can read chat"
ON public.meeting_chat_messages FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Users can send chat messages" ON public.meeting_chat_messages;
CREATE POLICY "Users and guests can send chat messages"
ON public.meeting_chat_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (guest_token_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.meeting_guest_tokens mgt
    WHERE mgt.id = guest_token_id AND mgt.expires_at > now()
  ))
);

-- 5. Add allow_guest_access to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS allow_guest_access boolean NOT NULL DEFAULT false;

-- 6. Add meeting_guest_analytics to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_guest_analytics;
