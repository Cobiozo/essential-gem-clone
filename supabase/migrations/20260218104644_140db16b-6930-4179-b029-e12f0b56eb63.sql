
-- Remove duplicate/conflicting RLS policies on meeting_chat_messages
-- Keep only the authenticated-role policies

DROP POLICY IF EXISTS "Users can read meeting chat messages" ON public.meeting_chat_messages;
DROP POLICY IF EXISTS "Users can send meeting chat messages" ON public.meeting_chat_messages;

-- Ensure the authenticated policies exist (recreate to be safe)
DROP POLICY IF EXISTS "Users can read chat in their rooms" ON public.meeting_chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON public.meeting_chat_messages;

CREATE POLICY "Users can read chat in their rooms"
ON public.meeting_chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_room_participants mrp
    WHERE mrp.room_id = meeting_chat_messages.room_id
    AND mrp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send chat messages"
ON public.meeting_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.meeting_room_participants mrp
    WHERE mrp.room_id = meeting_chat_messages.room_id
    AND mrp.user_id = auth.uid()
    AND mrp.is_active = true
  )
);
