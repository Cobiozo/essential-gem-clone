
-- Update register_event_guest RPC: remove registration_attempts increment on duplicate
CREATE OR REPLACE FUNCTION public.register_event_guest(
  p_event_id uuid, 
  p_email text, 
  p_first_name text, 
  p_last_name text DEFAULT NULL, 
  p_phone text DEFAULT NULL, 
  p_invited_by uuid DEFAULT NULL, 
  p_source text DEFAULT 'webinar_form',
  p_slot_time text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO guest_event_registrations (
    event_id, email, first_name, last_name, phone, invited_by_user_id, source, registration_attempts, slot_time
  )
  VALUES (
    p_event_id, p_email, p_first_name, p_last_name, p_phone, p_invited_by, p_source, 1, p_slot_time
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status', 'registered', 'attempts', 1, 'id', v_id);

EXCEPTION WHEN unique_violation THEN
  -- Do NOT increment registration_attempts, just return already_registered
  RETURN jsonb_build_object('status', 'already_registered', 'attempts', 1);
END;
$function$;
