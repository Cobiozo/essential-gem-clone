-- Fix CHECK constraint to include 'specjalista' role

-- Drop old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_role_values;

-- Add updated constraint with all valid roles
ALTER TABLE profiles ADD CONSTRAINT valid_role_values 
CHECK (lower(role) = ANY (ARRAY['user'::text, 'client'::text, 'admin'::text, 'partner'::text, 'specjalista'::text]));

-- PART 1: Sync existing profiles.role from user_roles.role

-- Disable triggers to allow role updates
ALTER TABLE profiles DISABLE TRIGGER prevent_role_escalation_trigger;
ALTER TABLE profiles DISABLE TRIGGER validate_role_change_trigger;

-- Sync profiles.role from user_roles.role for all inconsistent records
UPDATE profiles p
SET role = ur.role::text, updated_at = now()
FROM user_roles ur
WHERE p.user_id = ur.user_id
  AND p.role != ur.role::text;

-- Re-enable triggers
ALTER TABLE profiles ENABLE TRIGGER prevent_role_escalation_trigger;
ALTER TABLE profiles ENABLE TRIGGER validate_role_change_trigger;

-- PART 2: Create auto-sync trigger for future role changes

-- Function to sync profile role when user_roles changes
CREATE OR REPLACE FUNCTION public.sync_profile_role_from_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable role protection triggers
  ALTER TABLE profiles DISABLE TRIGGER prevent_role_escalation_trigger;
  ALTER TABLE profiles DISABLE TRIGGER validate_role_change_trigger;
  
  -- Update profiles.role to match user_roles.role
  UPDATE profiles 
  SET role = NEW.role::text, updated_at = now()
  WHERE user_id = NEW.user_id;
  
  -- Re-enable triggers
  ALTER TABLE profiles ENABLE TRIGGER prevent_role_escalation_trigger;
  ALTER TABLE profiles ENABLE TRIGGER validate_role_change_trigger;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS sync_user_role_to_profile ON user_roles;
CREATE TRIGGER sync_user_role_to_profile
  AFTER INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_from_user_roles();