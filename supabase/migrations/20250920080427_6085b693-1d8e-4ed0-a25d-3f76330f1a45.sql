-- Complete the security fix by adding the role validation trigger
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
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();