-- CRITICAL SECURITY FIX: Prevent privilege escalation vulnerability
-- Remove the existing update policy that allows users to update their role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new update policy that excludes the role column
-- Users can update their profile but NOT their role
CREATE POLICY "Users can update their own profile (except role)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND OLD.role = NEW.role  -- Role cannot be changed by regular users
);

-- Create admin-only policy for role management
CREATE POLICY "Admins can manage user roles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Add validation trigger to prevent role escalation attempts
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS trigger AS $$
BEGIN
  -- Log role change attempts for security audit
  IF OLD.role != NEW.role THEN
    -- Only allow role changes if the user is an admin
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Unauthorized role change attempt. Only admins can modify user roles.';
    END IF;
    
    -- Validate role values
    IF NEW.role NOT IN ('user', 'admin') THEN
      RAISE EXCEPTION 'Invalid role value. Must be either user or admin.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for role validation
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();

-- Add constraint to ensure valid role values
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_role_check 
CHECK (role IN ('user', 'admin'));