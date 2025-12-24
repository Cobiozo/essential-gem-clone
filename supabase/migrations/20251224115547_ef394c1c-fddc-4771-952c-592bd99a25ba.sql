-- Create helper function to check thread participation (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_thread_participant(thread_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.private_chat_threads t
    WHERE t.id = thread_uuid
    AND (
      t.initiator_id = auth.uid() 
      OR t.participant_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.private_chat_participants p
    WHERE p.thread_id = thread_uuid 
    AND p.user_id = auth.uid() 
    AND p.is_active = true
  );
$$;

-- Fix RLS policies for private_chat_participants (remove recursion)
DROP POLICY IF EXISTS "Thread participants can view" ON public.private_chat_participants;
CREATE POLICY "Thread participants can view" ON public.private_chat_participants
FOR SELECT USING (
  public.is_thread_participant(thread_id)
);

DROP POLICY IF EXISTS "Thread initiators can add participants" ON public.private_chat_participants;
CREATE POLICY "Thread initiators can add participants" ON public.private_chat_participants
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.private_chat_threads t
    WHERE t.id = thread_id AND t.initiator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can update own record" ON public.private_chat_participants;
CREATE POLICY "Participants can update own record" ON public.private_chat_participants
FOR UPDATE USING (user_id = auth.uid());

-- Fix RLS policies for private_chat_threads (use helper function)
DROP POLICY IF EXISTS "Users can view their threads" ON public.private_chat_threads;
CREATE POLICY "Users can view their threads" ON public.private_chat_threads
FOR SELECT USING (
  public.is_thread_participant(id)
);

-- Fix RLS policies for private_chat_messages (use helper function)
DROP POLICY IF EXISTS "Thread participants can view messages" ON public.private_chat_messages;
CREATE POLICY "Thread participants can view messages" ON public.private_chat_messages
FOR SELECT USING (
  public.is_thread_participant(thread_id)
);

DROP POLICY IF EXISTS "Thread participants can send messages" ON public.private_chat_messages;
CREATE POLICY "Thread participants can send messages" ON public.private_chat_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND public.is_thread_participant(thread_id)
);