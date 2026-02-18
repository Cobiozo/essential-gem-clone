ALTER TABLE public.meeting_chat_messages
ADD COLUMN target_user_id uuid DEFAULT NULL;