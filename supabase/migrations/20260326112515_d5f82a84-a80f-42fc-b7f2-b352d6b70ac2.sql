-- Allow all authenticated users to read purebox visibility settings
CREATE POLICY "authenticated_select_purebox_settings"
ON public.purebox_settings
FOR SELECT
TO authenticated
USING (true);

-- Allow users to read their own purebox access grants
CREATE POLICY "users_select_own_purebox_access"
ON public.purebox_user_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());