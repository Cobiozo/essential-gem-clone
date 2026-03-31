
-- 1. Add occurrence_date and occurrence_time columns to guest_event_registrations
ALTER TABLE public.guest_event_registrations 
ADD COLUMN IF NOT EXISTS occurrence_date TEXT,
ADD COLUMN IF NOT EXISTS occurrence_time TEXT;

-- 2. Update register_event_guest RPC with new parameters
DROP FUNCTION IF EXISTS public.register_event_guest(uuid, text, text, text, text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.register_event_guest(
  p_event_id uuid, 
  p_email text, 
  p_first_name text, 
  p_last_name text DEFAULT NULL, 
  p_phone text DEFAULT NULL, 
  p_invited_by uuid DEFAULT NULL, 
  p_source text DEFAULT 'webinar_form',
  p_slot_time text DEFAULT NULL,
  p_occurrence_date text DEFAULT NULL,
  p_occurrence_time text DEFAULT NULL
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
    event_id, email, first_name, last_name, phone, invited_by_user_id, source, registration_attempts, slot_time, occurrence_date, occurrence_time
  )
  VALUES (
    p_event_id, p_email, p_first_name, p_last_name, p_phone, p_invited_by, p_source, 1, p_slot_time, p_occurrence_date, p_occurrence_time
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status', 'registered', 'attempts', 1, 'id', v_id);

EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('status', 'already_registered', 'attempts', 1);
END;
$function$;
