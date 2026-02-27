-- Fix: Extend SELECT policy to include leader-created resources for owner and team
DROP POLICY IF EXISTS "Users can view resources based on role" ON public.knowledge_resources;

CREATE POLICY "Users can view resources based on role"
ON public.knowledge_resources
FOR SELECT
TO authenticated
USING (
  status = 'active' AND (
    -- Existing visibility flags (admin-created resources)
    visible_to_everyone = true
    OR (visible_to_clients = true AND get_current_user_role() IN ('client', 'user'))
    OR (visible_to_partners = true AND get_current_user_role() = 'partner')
    OR (visible_to_specjalista = true AND get_current_user_role() = 'specjalista')
    -- Leader sees own resources
    OR (created_by = auth.uid())
    -- Team members see their leader's resources
    OR (created_by IN (SELECT public.get_user_leader_ids(auth.uid())))
  )
);