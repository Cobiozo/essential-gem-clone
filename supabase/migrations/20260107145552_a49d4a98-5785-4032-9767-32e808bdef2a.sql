CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  guardian_user_id uuid;
  new_user_first_name text;
  new_user_last_name text;
BEGIN
  -- Insert into profiles with correct column name phone_number
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    phone_number,
    eq_id,
    upline_eq_id,
    upline_first_name,
    upline_last_name,
    guardian_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone_number',
    NEW.raw_user_meta_data ->> 'eq_id',
    NEW.raw_user_meta_data ->> 'upline_eq_id',
    NEW.raw_user_meta_data ->> 'upline_first_name',
    NEW.raw_user_meta_data ->> 'upline_last_name',
    NEW.raw_user_meta_data ->> 'guardian_name'
  );

  -- Assign default 'client' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  -- Get user's name for notifications
  new_user_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nowy');
  new_user_last_name := COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'użytkownik');
  
  -- If upline_eq_id is provided, find the guardian user and send notification
  IF NEW.raw_user_meta_data ->> 'upline_eq_id' IS NOT NULL 
     AND NEW.raw_user_meta_data ->> 'upline_eq_id' != '' THEN
    -- Find guardian's user_id by their eq_id
    SELECT user_id INTO guardian_user_id
    FROM public.profiles
    WHERE eq_id = NEW.raw_user_meta_data ->> 'upline_eq_id';
    
    IF guardian_user_id IS NOT NULL THEN
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
        '/my-account?tab=team-contacts&subTab=team',
        jsonb_build_object('new_user_id', NEW.id, 'new_user_email', NEW.email)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;