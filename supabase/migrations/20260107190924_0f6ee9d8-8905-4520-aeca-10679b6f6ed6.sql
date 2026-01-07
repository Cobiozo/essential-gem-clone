-- Restore full handle_new_user function with team_contacts creation
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
  new_user_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nowy');
  new_user_last_name := COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'użytkownik');
  upline_eqid := NEW.raw_user_meta_data ->> 'upline_eq_id';

  -- Insert into profiles with guardian data - NEW USERS ARE NOT APPROVED
  INSERT INTO public.profiles (
    user_id, email, eq_id, first_name, last_name, phone_number, 
    guardian_name, upline_eq_id, upline_first_name, upline_last_name,
    is_active, profile_completed, guardian_approved, admin_approved
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
    true,   -- is_active
    false,  -- profile_completed
    false,  -- guardian_approved (awaiting guardian)
    false   -- admin_approved (awaiting admin)
  );
  
  -- Determine role from metadata or default to client
  BEGIN
    user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'client'::app_role);
  EXCEPTION WHEN OTHERS THEN
    user_role := 'client'::app_role;
  END;
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role);
  
  -- AUTO-ADD NEW USER TO GUARDIAN'S TEAM_CONTACTS
  IF upline_eqid IS NOT NULL AND upline_eqid <> '' THEN
    -- Find guardian's user_id by their eq_id
    SELECT p.user_id INTO guardian_user_id
    FROM public.profiles p 
    WHERE p.eq_id = upline_eqid 
    LIMIT 1;
    
    IF guardian_user_id IS NOT NULL THEN
      -- Check if contact doesn't already exist
      IF NOT EXISTS (
        SELECT 1 FROM public.team_contacts 
        WHERE user_id = guardian_user_id 
          AND linked_user_id = NEW.id 
          AND is_active = true
      ) THEN
        -- Create team_contacts entry with linked_user_id
        INSERT INTO public.team_contacts (
          user_id, first_name, last_name, eq_id, role, email, phone_number,
          notes, added_at, is_active, contact_type, linked_user_id
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
          NEW.id  -- CRITICAL: linked_user_id for JOIN with profiles
        );
      END IF;
      
      -- Send notification to guardian about new user awaiting approval
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
        '/my-account?tab=team-contacts&subTab=team',
        jsonb_build_object('new_user_id', NEW.id, 'new_user_email', NEW.email)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix existing data: Add missing team_contacts entries for users with upline who don't have one
INSERT INTO public.team_contacts (
  user_id, first_name, last_name, eq_id, role, email, 
  phone_number, notes, added_at, is_active, contact_type, linked_user_id
)
SELECT 
  guardian.user_id,
  p.first_name,
  p.last_name,
  p.eq_id,
  COALESCE(ur.role::text, 'client'),
  p.email,
  p.phone_number,
  'Automatycznie dodany - naprawiony wpis',
  CURRENT_DATE,
  true,
  'team_member',
  p.user_id
FROM profiles p
JOIN profiles guardian ON guardian.eq_id = p.upline_eq_id
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.upline_eq_id IS NOT NULL
  AND p.upline_eq_id <> ''
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM team_contacts tc 
    WHERE tc.user_id = guardian.user_id 
      AND tc.linked_user_id = p.user_id
      AND tc.is_active = true
  );