-- First, create a helper function to get current user's eq_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_eq_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT eq_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Guardians can view their team members profiles" ON public.profiles;

-- Recreate the policy using the helper function (no subquery = no recursion)
CREATE POLICY "Guardians can view their team members profiles"
ON public.profiles
FOR SELECT
USING (
  upline_eq_id IS NOT NULL 
  AND upline_eq_id = public.get_current_user_eq_id()
);