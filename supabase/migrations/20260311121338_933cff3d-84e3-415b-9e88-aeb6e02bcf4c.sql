
ALTER TABLE public.team_contacts ADD COLUMN IF NOT EXISTS moved_to_own_list BOOLEAN DEFAULT false;
ALTER TABLE public.team_contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
