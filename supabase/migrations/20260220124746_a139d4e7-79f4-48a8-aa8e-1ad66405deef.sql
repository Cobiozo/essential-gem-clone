ALTER TABLE public.leader_permissions 
ADD COLUMN IF NOT EXISTS can_view_org_tree boolean DEFAULT false;