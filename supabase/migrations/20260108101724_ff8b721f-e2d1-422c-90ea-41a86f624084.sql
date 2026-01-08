-- First, clean up orphaned records (linked_user_id pointing to non-existent profiles)
UPDATE public.team_contacts 
SET linked_user_id = NULL 
WHERE linked_user_id IS NOT NULL 
  AND linked_user_id NOT IN (SELECT user_id FROM public.profiles);

-- Add foreign key constraint
ALTER TABLE public.team_contacts
ADD CONSTRAINT team_contacts_linked_user_id_fkey 
FOREIGN KEY (linked_user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_team_contacts_linked_user_id 
ON public.team_contacts(linked_user_id);