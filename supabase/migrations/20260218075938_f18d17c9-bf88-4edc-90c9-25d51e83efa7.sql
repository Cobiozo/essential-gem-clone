
-- Create meeting chat messages table
CREATE TABLE public.meeting_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  display_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read messages from any room they're in
CREATE POLICY "Users can read meeting chat messages"
ON public.meeting_chat_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can insert their own messages
CREATE POLICY "Users can send meeting chat messages"
ON public.meeting_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_chat_messages;
