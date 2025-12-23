-- Add approval columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ DEFAULT NULL;

-- Set existing users as fully approved (they were already in the system)
UPDATE public.profiles 
SET guardian_approved = TRUE, 
    guardian_approved_at = created_at,
    admin_approved = TRUE, 
    admin_approved_at = created_at
WHERE guardian_approved IS NULL OR admin_approved IS NULL;

-- Function for guardian to approve their team member
CREATE OR REPLACE FUNCTION public.guardian_approve_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guardian_eq_id text;
  target_upline_eq_id text;
  target_first_name text;
  target_last_name text;
BEGIN
  -- Get current user's EQ ID
  SELECT eq_id INTO guardian_eq_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Get target user's upline EQ ID and name
  SELECT upline_eq_id, first_name, last_name 
  INTO target_upline_eq_id, target_first_name, target_last_name
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  -- Check if the current user is the guardian of the target user
  IF guardian_eq_id IS NULL OR target_upline_eq_id IS NULL OR guardian_eq_id != target_upline_eq_id THEN
    RAISE EXCEPTION 'Access denied: You are not the guardian of this user';
  END IF;
  
  -- Check if already approved by guardian
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id AND guardian_approved = TRUE) THEN
    RAISE EXCEPTION 'User is already approved by guardian';
  END IF;
  
  -- Update the profile
  UPDATE public.profiles
  SET guardian_approved = TRUE,
      guardian_approved_at = NOW(),
      updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Send notification to all admins about new user awaiting admin approval
  INSERT INTO public.user_notifications (
    user_id,
    notification_type,
    source_module,
    title,
    message,
    link,
    metadata
  )
  SELECT 
    ur.user_id,
    'approval_request',
    'registration',
    'Nowy użytkownik oczekuje na zatwierdzenie',
    format('Użytkownik %s %s został zatwierdzony przez opiekuna i oczekuje na Twoje zatwierdzenie.', target_first_name, target_last_name),
    '/admin?tab=users',
    jsonb_build_object('target_user_id', target_user_id, 'guardian_id', auth.uid())
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
  -- Send notification to the user
  INSERT INTO public.user_notifications (
    user_id,
    notification_type,
    source_module,
    title,
    message,
    metadata
  )
  VALUES (
    target_user_id,
    'approval_status',
    'registration',
    'Opiekun zatwierdził Twoją rejestrację!',
    'Twój opiekun zatwierdził Twoją rejestrację. Teraz oczekujesz na zatwierdzenie przez Administratora.',
    jsonb_build_object('guardian_approved', true, 'admin_approved', false)
  );
  
  RETURN TRUE;
END;
$$;

-- Function for admin to approve user (only after guardian approved)
CREATE OR REPLACE FUNCTION public.admin_approve_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_guardian_approved boolean;
  target_first_name text;
  target_last_name text;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can approve users';
  END IF;
  
  -- Get target user info
  SELECT guardian_approved, first_name, last_name 
  INTO target_guardian_approved, target_first_name, target_last_name
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  -- Check if guardian has approved first
  IF target_guardian_approved IS NULL OR target_guardian_approved = FALSE THEN
    RAISE EXCEPTION 'User must be approved by guardian first';
  END IF;
  
  -- Check if already approved by admin
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id AND admin_approved = TRUE) THEN
    RAISE EXCEPTION 'User is already approved by admin';
  END IF;
  
  -- Update the profile
  UPDATE public.profiles
  SET admin_approved = TRUE,
      admin_approved_at = NOW(),
      updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Send notification to the user
  INSERT INTO public.user_notifications (
    user_id,
    notification_type,
    source_module,
    title,
    message,
    metadata
  )
  VALUES (
    target_user_id,
    'approval_status',
    'registration',
    'Twoje konto zostało w pełni zatwierdzone!',
    'Administrator zatwierdził Twoje konto. Możesz teraz w pełni korzystać z systemu. Witamy!',
    jsonb_build_object('guardian_approved', true, 'admin_approved', true)
  );
  
  RETURN TRUE;
END;
$$;

-- Update handle_new_user trigger to send notification to guardian
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

  -- Insert into profiles (with guardian data) - NEW USERS ARE NOT APPROVED
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
    profile_completed,
    guardian_approved,
    admin_approved
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
    false,  -- New users must complete profile
    false,  -- New users need guardian approval
    false   -- New users need admin approval
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
    
    -- If guardian found, add new user to their contacts as TEAM MEMBER
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
          is_active,
          contact_type,
          linked_user_id
        )
        VALUES (
          guardian_user_id,
          new_user_first_name,
          new_user_last_name,
          new_user_eq_id,
          user_role::text,
          NEW.email,
          NEW.raw_user_meta_data ->> 'phone_number',
          'Automatycznie dodany po rejestracji - oczekuje na zatwierdzenie',
          CURRENT_DATE,
          true,
          'team_member',
          NEW.id
        );
      END IF;
      
      -- Send notification to guardian about new team member awaiting approval
      INSERT INTO public.user_notifications (
        user_id,
        notification_type,
        source_module,
        title,
        message,
        link,
        metadata
      )
      VALUES (
        guardian_user_id,
        'approval_request',
        'registration',
        'Nowa osoba zarejestrowana i oczekuje na Twoje zatwierdzenie',
        format('Użytkownik %s %s zarejestrował się, wskazując Ciebie jako opiekuna. Zatwierdź tę osobę w zakładce Pure-kontakty.', new_user_first_name, new_user_last_name),
        '/my-account?tab=team-contacts',
        jsonb_build_object('new_user_id', NEW.id, 'new_user_email', NEW.email)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;