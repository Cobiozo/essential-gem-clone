-- Update profiles table to support new Partner role
-- First, update any existing 'user' roles to 'client' 
UPDATE public.profiles 
SET role = 'client' 
WHERE role = 'user';

-- Update the role validation function to include the new Partner role
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log role change attempts for security audit
  IF OLD.role != NEW.role THEN
    -- Only allow role changes if the user is an admin
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Unauthorized role change attempt. Only admins can modify user roles.';
    END IF;
    
    -- Validate role values to include new Partner role
    IF NEW.role NOT IN ('client', 'admin', 'partner') THEN
      RAISE EXCEPTION 'Invalid role value. Must be either client, admin, or partner.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the role escalation prevention function
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Prevent non-admin users from changing roles
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied: Only administrators can modify user roles';
    END IF;
  END IF;
  
  -- Validate role values to include Partner
  IF NEW.role NOT IN ('client', 'admin', 'partner') THEN
    RAISE EXCEPTION 'Invalid role: must be client, admin, or partner';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the handle_new_user function to set default role as 'client'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'client');
  RETURN NEW;
END;
$function$;

-- Update the default value for role column
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'client';