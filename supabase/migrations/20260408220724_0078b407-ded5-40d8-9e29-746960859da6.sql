-- Add new columns to leader_permissions
ALTER TABLE public.leader_permissions 
  ADD COLUMN IF NOT EXISTS auto_webinar_granted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS can_manage_auto_webinar_access boolean DEFAULT false;

-- Create a security definer function for leaders to update auto-webinar access
-- This checks that the target user is in the leader's downline
CREATE OR REPLACE FUNCTION public.leader_update_auto_webinar_access(
  p_target_user_id uuid,
  p_grant_access boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  v_leader_eq_id text;
  v_is_in_downline boolean := false;
BEGIN
  -- Check caller has can_manage_auto_webinar_access permission
  IF NOT EXISTS (
    SELECT 1 FROM leader_permissions
    WHERE user_id = auth.uid()
    AND can_manage_auto_webinar_access = true
  ) THEN
    RAISE EXCEPTION 'Access denied: auto-webinar management permission required';
  END IF;

  -- Prevent self-assignment
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify your own auto-webinar access';
  END IF;

  -- Get leader's eq_id
  SELECT eq_id INTO v_leader_eq_id
  FROM profiles WHERE user_id = auth.uid();

  IF v_leader_eq_id IS NULL THEN
    RAISE EXCEPTION 'Leader profile not found';
  END IF;

  -- Verify target is in leader's downline via org tree
  SELECT EXISTS (
    SELECT 1 FROM get_organization_tree(v_leader_eq_id, 10) ot
    WHERE ot.id = p_target_user_id AND ot.level > 0
  ) INTO v_is_in_downline;

  IF NOT v_is_in_downline THEN
    RAISE EXCEPTION 'User is not in your organization structure';
  END IF;

  -- Upsert leader_permissions for target user
  INSERT INTO leader_permissions (user_id, can_access_auto_webinar, auto_webinar_granted_by)
  VALUES (p_target_user_id, p_grant_access, CASE WHEN p_grant_access THEN auth.uid() ELSE NULL END)
  ON CONFLICT (user_id) DO UPDATE SET
    can_access_auto_webinar = p_grant_access,
    auto_webinar_granted_by = CASE WHEN p_grant_access THEN auth.uid() ELSE NULL END;

  RETURN true;
END;
$$;