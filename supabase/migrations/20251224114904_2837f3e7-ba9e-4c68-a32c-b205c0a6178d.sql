-- Add is_group column to private_chat_threads
ALTER TABLE public.private_chat_threads 
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;

-- Create private_chat_participants table for group chat members
CREATE TABLE IF NOT EXISTS public.private_chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.private_chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(thread_id, user_id)
);

-- Enable RLS
ALTER TABLE public.private_chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage all participants
CREATE POLICY "Admins can manage participants" ON public.private_chat_participants
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- RLS: Thread participants can view other participants
CREATE POLICY "Thread participants can view" ON public.private_chat_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.private_chat_threads t
    WHERE t.id = thread_id
    AND (
      t.initiator_id = auth.uid() 
      OR t.participant_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.private_chat_participants p 
        WHERE p.thread_id = t.id AND p.user_id = auth.uid() AND p.is_active = true
      )
    )
  )
);

-- Enable realtime for participants table
ALTER TABLE public.private_chat_participants REPLICA IDENTITY FULL;

-- Update private_chat_messages RLS to support group chats
DROP POLICY IF EXISTS "Thread participants can view messages" ON public.private_chat_messages;
CREATE POLICY "Thread participants can view messages" ON public.private_chat_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.private_chat_threads t
    WHERE t.id = private_chat_messages.thread_id
    AND (
      t.initiator_id = auth.uid() 
      OR t.participant_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.private_chat_participants p 
        WHERE p.thread_id = t.id AND p.user_id = auth.uid() AND p.is_active = true
      )
    )
  )
);

DROP POLICY IF EXISTS "Thread participants can send messages" ON public.private_chat_messages;
CREATE POLICY "Thread participants can send messages" ON public.private_chat_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM public.private_chat_threads t
    WHERE t.id = private_chat_messages.thread_id
    AND t.status = 'active'
    AND (
      t.initiator_id = auth.uid() 
      OR t.participant_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.private_chat_participants p 
        WHERE p.thread_id = t.id AND p.user_id = auth.uid() AND p.is_active = true
      )
    )
  )
);

DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.private_chat_messages;
CREATE POLICY "Recipients can mark messages as read" ON public.private_chat_messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.private_chat_threads t
    WHERE t.id = private_chat_messages.thread_id
    AND (
      t.initiator_id = auth.uid() 
      OR t.participant_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.private_chat_participants p 
        WHERE p.thread_id = t.id AND p.user_id = auth.uid() AND p.is_active = true
      )
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.private_chat_threads t
    WHERE t.id = private_chat_messages.thread_id
    AND (
      t.initiator_id = auth.uid() 
      OR t.participant_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.private_chat_participants p 
        WHERE p.thread_id = t.id AND p.user_id = auth.uid() AND p.is_active = true
      )
    )
  )
);

-- Update private_chat_threads RLS to support group chats
DROP POLICY IF EXISTS "Users can view their threads" ON public.private_chat_threads;
CREATE POLICY "Users can view their threads" ON public.private_chat_threads
FOR SELECT USING (
  auth.uid() = initiator_id 
  OR auth.uid() = participant_id
  OR EXISTS (
    SELECT 1 FROM public.private_chat_participants p 
    WHERE p.thread_id = id AND p.user_id = auth.uid() AND p.is_active = true
  )
);

DROP POLICY IF EXISTS "Thread participants can update thread" ON public.private_chat_threads;
CREATE POLICY "Thread participants can update thread" ON public.private_chat_threads
FOR UPDATE USING (
  auth.uid() = initiator_id 
  OR auth.uid() = participant_id
  OR EXISTS (
    SELECT 1 FROM public.private_chat_participants p 
    WHERE p.thread_id = id AND p.user_id = auth.uid() AND p.is_active = true
  )
) WITH CHECK (
  auth.uid() = initiator_id 
  OR auth.uid() = participant_id
  OR EXISTS (
    SELECT 1 FROM public.private_chat_participants p 
    WHERE p.thread_id = id AND p.user_id = auth.uid() AND p.is_active = true
  )
);