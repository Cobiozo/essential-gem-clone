-- Add column to track when linked user was deleted
ALTER TABLE public.team_contacts 
ADD COLUMN IF NOT EXISTS linked_user_deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster queries on deleted users
CREATE INDEX IF NOT EXISTS idx_team_contacts_linked_user_deleted 
ON public.team_contacts (linked_user_deleted_at) 
WHERE linked_user_deleted_at IS NOT NULL;

-- Fix existing orphaned contacts where linked_user_id points to a non-existent user
UPDATE public.team_contacts tc
SET linked_user_deleted_at = NOW()
WHERE tc.linked_user_id IS NOT NULL
  AND tc.linked_user_deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = tc.linked_user_id
  );