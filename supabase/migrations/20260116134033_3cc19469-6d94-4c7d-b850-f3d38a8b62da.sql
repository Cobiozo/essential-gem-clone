-- Dodaj politykę UPDATE dla użytkowników na ich własny rekord w leader_permissions
CREATE POLICY "users_update_own_permissions"
ON public.leader_permissions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());