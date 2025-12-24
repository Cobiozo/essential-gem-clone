-- Make participant_id nullable for group chats
ALTER TABLE public.private_chat_threads 
ALTER COLUMN participant_id DROP NOT NULL;

-- Add constraint: for 1:1 chats participant_id is required, for group chats it can be NULL
ALTER TABLE public.private_chat_threads
ADD CONSTRAINT check_participant_or_group 
CHECK (
  (is_group = true) OR 
  (is_group = false AND participant_id IS NOT NULL)
);