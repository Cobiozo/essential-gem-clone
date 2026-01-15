-- Drop existing policy that only allows authenticated users
DROP POLICY IF EXISTS "Authenticated users can view active reflinks" ON public.reflinks;

-- Create new policy that allows both anon and authenticated users to view active reflinks
CREATE POLICY "Anyone can view active reflinks"
ON public.reflinks
FOR SELECT
TO anon, authenticated
USING (is_active = true);