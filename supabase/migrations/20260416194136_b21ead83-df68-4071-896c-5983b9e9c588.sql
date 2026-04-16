-- Remove self-conversations (where admin equals target)
DELETE FROM public.admin_conversations WHERE admin_user_id = target_user_id;

-- Add CHECK constraint to prevent future self-conversations
ALTER TABLE public.admin_conversations
  ADD CONSTRAINT admin_conversations_no_self_chat
  CHECK (admin_user_id <> target_user_id);