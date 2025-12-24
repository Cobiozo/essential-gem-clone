-- Tabela wątków prywatnych czatu
CREATE TABLE public.private_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ
);

-- Tabela wiadomości w wątkach prywatnych
CREATE TABLE public.private_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.private_chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexy dla wydajności
CREATE INDEX idx_private_chat_threads_initiator ON public.private_chat_threads(initiator_id);
CREATE INDEX idx_private_chat_threads_participant ON public.private_chat_threads(participant_id);
CREATE INDEX idx_private_chat_threads_status ON public.private_chat_threads(status);
CREATE INDEX idx_private_chat_messages_thread ON public.private_chat_messages(thread_id);
CREATE INDEX idx_private_chat_messages_sender ON public.private_chat_messages(sender_id);
CREATE INDEX idx_private_chat_messages_read ON public.private_chat_messages(is_read);

-- RLS dla wątków
ALTER TABLE public.private_chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their threads"
  ON public.private_chat_threads
  FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = participant_id);

CREATE POLICY "Users can create threads"
  ON public.private_chat_threads
  FOR INSERT
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Thread participants can update thread"
  ON public.private_chat_threads
  FOR UPDATE
  USING (auth.uid() = initiator_id OR auth.uid() = participant_id)
  WITH CHECK (auth.uid() = initiator_id OR auth.uid() = participant_id);

CREATE POLICY "Initiator can delete thread"
  ON public.private_chat_threads
  FOR DELETE
  USING (auth.uid() = initiator_id);

CREATE POLICY "Admins can manage all threads"
  ON public.private_chat_threads
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RLS dla wiadomości
ALTER TABLE public.private_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can view messages"
  ON public.private_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.private_chat_threads t
      WHERE t.id = thread_id
      AND (t.initiator_id = auth.uid() OR t.participant_id = auth.uid())
    )
  );

CREATE POLICY "Thread participants can send messages"
  ON public.private_chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.private_chat_threads t
      WHERE t.id = thread_id
      AND t.status = 'active'
      AND (t.initiator_id = auth.uid() OR t.participant_id = auth.uid())
    )
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.private_chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.private_chat_threads t
      WHERE t.id = thread_id
      AND (t.initiator_id = auth.uid() OR t.participant_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.private_chat_threads t
      WHERE t.id = thread_id
      AND (t.initiator_id = auth.uid() OR t.participant_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all messages"
  ON public.private_chat_messages
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Trigger do aktualizacji updated_at i last_message_at
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.private_chat_threads
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_thread_last_message
  AFTER INSERT ON public.private_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message();

-- Włącz realtime dla wiadomości
ALTER TABLE public.private_chat_messages REPLICA IDENTITY FULL;