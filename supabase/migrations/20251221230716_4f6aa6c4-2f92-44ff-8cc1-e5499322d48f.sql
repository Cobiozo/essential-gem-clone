-- Update handle_new_user function to store upline data and auto-add to guardian's contacts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role app_role;
  guardian_user_id uuid;
  new_user_eq_id text;
  new_user_first_name text;
  new_user_last_name text;
  upline_eqid text;
BEGIN
  -- Extract data from metadata
  new_user_eq_id := NEW.raw_user_meta_data ->> 'eq_id';
  new_user_first_name := NEW.raw_user_meta_data ->> 'first_name';
  new_user_last_name := NEW.raw_user_meta_data ->> 'last_name';
  upline_eqid := NEW.raw_user_meta_data ->> 'upline_eq_id';

  -- Insert into profiles (with guardian data)
  INSERT INTO public.profiles (
    user_id, 
    email, 
    eq_id, 
    first_name, 
    last_name, 
    phone_number, 
    guardian_name,
    upline_eq_id,
    upline_first_name,
    upline_last_name,
    is_active,
    profile_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    new_user_eq_id,
    new_user_first_name,
    new_user_last_name,
    NEW.raw_user_meta_data ->> 'phone_number',
    NEW.raw_user_meta_data ->> 'guardian_name',
    upline_eqid,
    NEW.raw_user_meta_data ->> 'upline_first_name',
    NEW.raw_user_meta_data ->> 'upline_last_name',
    true,
    false  -- New users must complete profile
  );
  
  -- Determine role
  BEGIN
    user_role := COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::app_role,
      'client'::app_role
    );
  EXCEPTION WHEN OTHERS THEN
    user_role := 'client'::app_role;
  END;
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- Auto-add new user to guardian's team_contacts if upline_eq_id is provided
  IF upline_eqid IS NOT NULL AND upline_eqid <> '' THEN
    -- Find the guardian's user_id by their eq_id
    SELECT p.user_id INTO guardian_user_id
    FROM public.profiles p
    WHERE p.eq_id = upline_eqid
    LIMIT 1;
    
    -- If guardian found, add new user to their contacts
    IF guardian_user_id IS NOT NULL THEN
      -- Check if contact doesn't already exist (by eq_id)
      IF NOT EXISTS (
        SELECT 1 FROM public.team_contacts 
        WHERE user_id = guardian_user_id 
        AND eq_id = new_user_eq_id
        AND is_active = true
      ) THEN
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
          is_active
        )
        VALUES (
          guardian_user_id,
          new_user_first_name,
          new_user_last_name,
          new_user_eq_id,
          user_role::text,
          NEW.email,
          NEW.raw_user_meta_data ->> 'phone_number',
          'Automatycznie dodany po rejestracji',
          CURRENT_DATE,
          true
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;