-- Add "specjalista" role to all role validation functions and triggers

-- Update the prevent_role_escalation function to include specjalista
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
  
  -- Validate role values to include specjalista
  IF NEW.role NOT IN ('user', 'client', 'admin', 'partner', 'specjalista') THEN
    RAISE EXCEPTION 'Invalid role: must be user, client, admin, partner, or specjalista';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the validate_role_change function to include specjalista
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
    
    -- Validate role values to include specjalista
    IF NEW.role NOT IN ('user', 'client', 'admin', 'partner', 'specjalista') THEN
      RAISE EXCEPTION 'Invalid role value. Must be user, client, admin, partner, or specjalista.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the admin_update_user_role function to include specjalista
CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id uuid, target_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_role_lower text := lower(target_role);
BEGIN
  -- Ensure only admins can call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can modify user roles';
  END IF;

  -- Validate role to include specjalista
  IF new_role_lower NOT IN ('user','client','admin','partner','specjalista') THEN
    RAISE EXCEPTION 'Invalid role: %', target_role;
  END IF;

  -- Apply update
  UPDATE public.profiles
     SET role = new_role_lower,
         updated_at = now()
   WHERE user_id = target_user_id;

  RETURN FOUND;
END;
$function$;

-- Update handle_new_user function to handle specjalista role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, role, eq_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
    NEW.raw_user_meta_data ->> 'eq_id',
    true
  );
  RETURN NEW;
END;
$function$;

-- Add visible_to_specjalista column to cms_sections table
ALTER TABLE public.cms_sections 
ADD COLUMN IF NOT EXISTS visible_to_specjalista boolean NOT NULL DEFAULT false;

-- Add visible_to_specjalista column to pages table  
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS visible_to_specjalista boolean NOT NULL DEFAULT false;