-- Remove misleading auto-note for newly registered team members, and clear existing ones
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  guardian_user_id uuid;
  new_user_eq_id text;
  new_user_first_name text;
  new_user_last_name text;
  upline_eqid text;
  v_guardian_is_leader boolean := false;
BEGIN
  new_user_eq_id := NEW.raw_user_meta_data ->> 'eq_id';
  new_user_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nowy');
  new_user_last_name := COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'użytkownik');
  upline_eqid := NEW.raw_user_meta_data ->> 'upline_eq_id';

  INSERT INTO public.profiles (
    user_id, email, eq_id, first_name, last_name, phone_number,
    guardian_name, upline_eq_id, upline_first_name, upline_last_name,
    is_active, profile_completed, guardian_approved, admin_approved
  )
  VALUES (
    NEW.id, NEW.email, new_user_eq_id, new_user_first_name, new_user_last_name,
    NEW.raw_user_meta_data ->> 'phone_number',
    NEW.raw_user_meta_data ->> 'guardian_name',
    upline_eqid,
    NEW.raw_user_meta_data ->> 'upline_first_name',
    NEW.raw_user_meta_data ->> 'upline_last_name',
    true, false, false, false
  );

  BEGIN
    user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'client'::app_role);
  EXCEPTION WHEN OTHERS THEN
    user_role := 'client'::app_role;
  END;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role);

  IF upline_eqid IS NOT NULL AND upline_eqid <> '' THEN
    SELECT p.user_id INTO guardian_user_id
    FROM public.profiles p
    WHERE p.eq_id = upline_eqid
    LIMIT 1;

    IF guardian_user_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.team_contacts
        WHERE user_id = guardian_user_id
          AND linked_user_id = NEW.id
          AND is_active = true
      ) THEN
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
          NULL,
          CURRENT_DATE,
          true,
          'team_member',
          NEW.id
        );
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.leader_permissions lp
        WHERE lp.user_id = guardian_user_id
          AND lp.can_approve_registrations = true
      ) THEN
        v_guardian_is_leader := true;

        UPDATE public.profiles SET
          guardian_approved = true,
          guardian_approved_at = now(),
          leader_approver_id = guardian_user_id
        WHERE user_id = NEW.id;

        INSERT INTO public.user_notifications (
          user_id, notification_type, source_module, title, message, link, metadata
        ) VALUES (
          guardian_user_id,
          'approval_request',
          'registration',
          'Nowa osoba oczekuje na Twoje zatwierdzenie w Panelu Lidera',
          format('%s %s zarejestrował się wskazując Ciebie jako opiekuna. Jako Lider możesz zatwierdzić konto jednym kliknięciem w Panelu Lidera.',
            new_user_first_name, new_user_last_name),
          '/leader?tab=approvals',
          jsonb_build_object('new_user_id', NEW.id, 'new_user_email', NEW.email, 'auto_guardian_approved', true)
        );
      END IF;

      IF NOT v_guardian_is_leader THEN
        INSERT INTO public.user_notifications (
          user_id, notification_type, source_module, title, message, link, metadata
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
  END IF;

  RETURN NEW;
END;
$function$;

-- Clear misleading auto-notes from existing team-member contacts
UPDATE public.team_contacts
SET notes = NULL
WHERE contact_type = 'team_member'
  AND notes IN (
    'Automatycznie dodany po rejestracji - oczekuje na zatwierdzenie',
    'Automatycznie dodany po rejestracji',
    'Automatycznie dodany - naprawiony wpis'
  );