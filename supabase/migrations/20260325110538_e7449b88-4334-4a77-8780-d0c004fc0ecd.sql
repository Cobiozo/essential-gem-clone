-- 1. Add slot_time column to guest_event_registrations
ALTER TABLE guest_event_registrations 
ADD COLUMN IF NOT EXISTS slot_time TEXT DEFAULT NULL;

-- 2. Drop old unique index and create new one that includes slot_time
DROP INDEX IF EXISTS unique_guest_per_event;
CREATE UNIQUE INDEX unique_guest_per_event 
ON guest_event_registrations (event_id, email, COALESCE(slot_time, ''))
WHERE status != 'cancelled';

-- 3. Recreate register_event_guest RPC with p_slot_time parameter
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
  v_attempts INT;
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
  UPDATE guest_event_registrations
  SET registration_attempts = COALESCE(registration_attempts, 1) + 1,
      updated_at = now()
  WHERE event_id = p_event_id
    AND lower(trim(email)) = lower(trim(p_email))
    AND COALESCE(slot_time, '') = COALESCE(p_slot_time, '')
    AND status != 'cancelled'
  RETURNING registration_attempts INTO v_attempts;

  RETURN jsonb_build_object('status', 'already_registered', 'attempts', COALESCE(v_attempts, 2));
END;
$function$;