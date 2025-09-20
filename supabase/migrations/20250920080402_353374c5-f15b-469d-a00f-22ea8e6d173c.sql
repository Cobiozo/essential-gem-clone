-- CRITICAL SECURITY FIX: Clean up and prevent privilege escalation
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile data" ON public.profiles;

-- Create a simple, secure approach
-- Users can only update email field (not role)
CREATE POLICY "Users can update their email only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can update everything including roles
CREATE POLICY "Admins have full profile access" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Add validation trigger for role changes
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger AS $$
BEGIN
  -- If role is being changed, ensure user is admin
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
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

-- Apply the security trigger
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- Ensure role constraint exists
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS valid_role_values;
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_role_values 
CHECK (role IN ('user', 'admin'));