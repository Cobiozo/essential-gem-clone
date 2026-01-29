-- Add INSERT policy for admins to create reflinks on behalf of any user
CREATE POLICY "Admins can create reflinks for any user"
ON user_reflinks FOR INSERT
TO authenticated
WITH CHECK (is_admin());