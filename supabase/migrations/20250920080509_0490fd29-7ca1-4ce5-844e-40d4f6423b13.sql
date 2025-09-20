-- CRITICAL SECURITY FIX: Clean up and prevent privilege escalation
-- Drop all existing update policies on profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.profiles;

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

-- Policy 1: Users can update their own non-role profile fields
CREATE POLICY "Users can update own profile except role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND NOT public.is_role_update(user_id, role)
);

-- Policy 2: Only admins can update any user roles
CREATE POLICY "Only admins can update roles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Add security trigger for additional protection
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger AS $$
BEGIN
  -- Check if role is being changed by non-admin
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security violation: Unauthorized role modification attempt blocked';
    END IF;
  END IF;
  
  -- Validate role values
  IF NEW.role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role value: %. Must be user or admin', NEW.role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the security trigger
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();