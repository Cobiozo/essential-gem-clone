DO $$
BEGIN
  -- Safely add role_chat_messages to realtime publication if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'role_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.role_chat_messages;
  END IF;
END $$;