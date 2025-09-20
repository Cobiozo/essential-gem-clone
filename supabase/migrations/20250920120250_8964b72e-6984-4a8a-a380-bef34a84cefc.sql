-- Simply update functions to support the new 'partner' role alongside existing 'user' role
-- We'll change terminology in the UI only, keeping database flexibility

-- Update the role validation function to include Partner role
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
    
    -- Validate role values to include new Partner role, keeping 'user' for backwards compatibility
    IF NEW.role NOT IN ('user', 'client', 'admin', 'partner') THEN
      RAISE EXCEPTION 'Invalid role value. Must be user, client, admin, or partner.';
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
  
  -- Validate role values to include Partner, keeping 'user' for backwards compatibility
  IF NEW.role NOT IN ('user', 'client', 'admin', 'partner') THEN
    RAISE EXCEPTION 'Invalid role: must be user, client, admin, or partner';
  END IF;
  
  RETURN NEW;
END;
$function$;