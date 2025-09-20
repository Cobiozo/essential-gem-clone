-- CRITICAL SECURITY FIX: Prevent privilege escalation vulnerability
-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a function to check if the role is being modified
CREATE OR REPLACE FUNCTION public.is_role_update(user_id_param uuid, new_role text)
RETURNS boolean AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role 
  FROM public.profiles 
  WHERE user_id = user_id_param;
  
  RETURN (current_role IS DISTINCT FROM new_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create separate policies for different types of updates
-- Policy 1: Users can update their non-role fields
CREATE POLICY "Users can update their own profile data" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND NOT public.is_role_update(user_id, role)
);

-- Policy 2: Only admins can update roles
CREATE POLICY "Admins can manage user roles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Add validation trigger for additional security
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS trigger AS $$
BEGIN
  -- Check if role is being changed
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    -- Only allow role changes if the user is an admin
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied: Only administrators can modify user roles';
    END IF;
  END IF;
  
  -- Validate role values
  IF NEW.role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: must be either user or admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the trigger
DROP TRIGGER IF EXISTS validate_profile_update_trigger ON public.profiles;
CREATE TRIGGER validate_profile_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_update();

-- Add role constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS valid_role_values;
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_role_values 
CHECK (role IN ('user', 'admin'));