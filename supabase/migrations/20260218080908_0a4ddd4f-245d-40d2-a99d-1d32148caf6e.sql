
-- #3: Add meeting_room_participants to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_room_participants;

-- #5: Fix overly permissive RLS on meeting_chat_messages
-- Drop old permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read meeting chat messages" ON meeting_chat_messages;

-- Create scoped SELECT policy: only read messages from rooms you participate in
CREATE POLICY "Users can read chat in their rooms"
ON meeting_chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM meeting_room_participants mrp
    WHERE mrp.room_id = meeting_chat_messages.room_id
    AND mrp.user_id = auth.uid()
  )
);

-- Fix INSERT policy role target
DROP POLICY IF EXISTS "Authenticated users can send meeting chat messages" ON meeting_chat_messages;
CREATE POLICY "Users can send chat messages"
ON meeting_chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- #7: Cleanup function for stale participants (inactive > 2 hours)
CREATE OR REPLACE FUNCTION public.cleanup_stale_meeting_participants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cleaned integer;
BEGIN
  UPDATE meeting_room_participants
  SET is_active = false, left_at = NOW()
  WHERE is_active = true
    AND joined_at < NOW() - INTERVAL '2 hours';
  GET DIAGNOSTICS cleaned = ROW_COUNT;
  RETURN cleaned;
END;
$$;

-- #8: Cleanup function for old chat messages (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_meeting_chat()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM meeting_chat_messages
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
