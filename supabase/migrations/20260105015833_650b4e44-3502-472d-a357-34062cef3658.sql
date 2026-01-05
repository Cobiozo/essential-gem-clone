-- Function to change user's guardian with team contacts transfer
CREATE OR REPLACE FUNCTION public.admin_change_user_guardian(
  p_user_id UUID,
  p_new_guardian_user_id UUID,
  p_new_guardian_eq_id TEXT,
  p_new_guardian_first_name TEXT,
  p_new_guardian_last_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_guardian_user_id UUID;
  v_user_profile RECORD;
  v_user_role TEXT;
BEGIN
  -- Only admins can use this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Get edited user's profile data
  SELECT * INTO v_user_profile 
  FROM public.profiles 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get user's role
  SELECT role::text INTO v_user_role
  FROM public.user_roles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- Find old guardian's user_id
  IF v_user_profile.upline_eq_id IS NOT NULL THEN
    SELECT p.user_id INTO v_old_guardian_user_id
    FROM public.profiles p
    WHERE p.eq_id = v_user_profile.upline_eq_id
    LIMIT 1;
  END IF;
  
  -- 1. Deactivate contact entry at old guardian
  IF v_old_guardian_user_id IS NOT NULL THEN
    UPDATE public.team_contacts 
    SET is_active = false,
        notes = COALESCE(notes, '') || E'\nPrzeniesiony do innego opiekuna przez administratora - ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI')
    WHERE user_id = v_old_guardian_user_id 
      AND linked_user_id = p_user_id
      AND is_active = true;
  END IF;
  
  -- 2. Add contact to new guardian (if specified)
  IF p_new_guardian_user_id IS NOT NULL THEN
    -- Check if contact already exists and reactivate, or create new
    IF EXISTS (
      SELECT 1 FROM public.team_contacts 
      WHERE user_id = p_new_guardian_user_id 
        AND linked_user_id = p_user_id
    ) THEN
      UPDATE public.team_contacts SET
        is_active = true,
        first_name = v_user_profile.first_name,
        last_name = v_user_profile.last_name,
        eq_id = v_user_profile.eq_id,
        email = v_user_profile.email,
        phone_number = v_user_profile.phone_number,
        notes = 'Przywrócony przez administratora - ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI')
      WHERE user_id = p_new_guardian_user_id 
        AND linked_user_id = p_user_id;
    ELSE
      INSERT INTO public.team_contacts (
        user_id,
        first_name, 
        last_name, 
        eq_id, 
        role,
        email, 
        phone_number, 
        notes, 
        added_at,
        is_active, 
        contact_type, 
        linked_user_id
      )
      VALUES (
        p_new_guardian_user_id,
        v_user_profile.first_name,
        v_user_profile.last_name,
        v_user_profile.eq_id,
        COALESCE(v_user_role, 'client'),
        v_user_profile.email,
        v_user_profile.phone_number,
        'Przeniesiony przez administratora - ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI'),
        CURRENT_DATE,
        true,
        'team_member',
        p_user_id
      );
    END IF;
  END IF;
  
  -- 3. Update user's profile with new guardian data
  UPDATE public.profiles SET
    upline_eq_id = p_new_guardian_eq_id,
    upline_first_name = p_new_guardian_first_name,
    upline_last_name = p_new_guardian_last_name,
    guardian_name = CASE 
      WHEN p_new_guardian_first_name IS NOT NULL AND p_new_guardian_last_name IS NOT NULL 
      THEN p_new_guardian_first_name || ' ' || p_new_guardian_last_name
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to update user's basic data (name, eq_id)
CREATE OR REPLACE FUNCTION public.admin_update_user_data(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_eq_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can use this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Check if new eq_id is unique (if changed)
  IF p_eq_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE eq_id = p_eq_id AND user_id != p_user_id
  ) THEN
    RAISE EXCEPTION 'EQ ID already exists';
  END IF;

  -- Update user's profile
  UPDATE public.profiles SET
    first_name = p_first_name,
    last_name = p_last_name,
    eq_id = p_eq_id,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Trigger function to sync user data in team_contacts
CREATE OR REPLACE FUNCTION public.sync_user_in_team_contacts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update data in all contacts linked to this user
  UPDATE public.team_contacts SET
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    eq_id = NEW.eq_id,
    email = NEW.email,
    phone_number = NEW.phone_number
  WHERE linked_user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS on_profile_update_sync_contacts ON public.profiles;
CREATE TRIGGER on_profile_update_sync_contacts
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.first_name IS DISTINCT FROM NEW.first_name OR
    OLD.last_name IS DISTINCT FROM NEW.last_name OR
    OLD.eq_id IS DISTINCT FROM NEW.eq_id OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone_number IS DISTINCT FROM NEW.phone_number
  )
  EXECUTE FUNCTION public.sync_user_in_team_contacts();