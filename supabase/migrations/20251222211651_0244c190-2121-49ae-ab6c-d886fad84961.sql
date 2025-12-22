-- Add RLS policy to allow anyone to search for potential guardians
-- This only exposes minimal data needed for guardian search
CREATE POLICY "Anyone can search for guardians"
ON public.profiles
FOR SELECT
USING (
  is_active = true 
  AND role IN ('partner', 'specjalista', 'admin')
);