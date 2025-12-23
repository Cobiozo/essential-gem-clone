-- Add RLS policy to allow guardians to view profiles of users who selected them as guardians
-- This is needed for the guardian approval workflow
CREATE POLICY "Guardians can view their team members profiles"
ON public.profiles
FOR SELECT
USING (
  upline_eq_id IS NOT NULL 
  AND upline_eq_id = (
    SELECT eq_id FROM public.profiles WHERE user_id = auth.uid()
  )
);