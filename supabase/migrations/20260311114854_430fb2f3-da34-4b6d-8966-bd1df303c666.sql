
-- 1. Add registration_attempts column
ALTER TABLE public.guest_event_registrations 
ADD COLUMN IF NOT EXISTS registration_attempts INTEGER NOT NULL DEFAULT 1;

-- 2. Create RPC function for atomic guest registration
CREATE OR REPLACE FUNCTION public.register_event_guest(
  p_event_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_invited_by UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'webinar_form'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts INT;
  v_id UUID;
BEGIN
  -- Try inserting new registration
  INSERT INTO guest_event_registrations (
    event_id, email, first_name, last_name, phone, invited_by_user_id, source, registration_attempts
  )
  VALUES (
    p_event_id, p_email, p_first_name, p_last_name, p_phone, p_invited_by, p_source, 1
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status', 'registered', 'attempts', 1, 'id', v_id);

EXCEPTION WHEN unique_violation THEN
  -- Active registration exists — increment attempt counter
  UPDATE guest_event_registrations
  SET registration_attempts = COALESCE(registration_attempts, 1) + 1,
      updated_at = now()
  WHERE event_id = p_event_id
    AND lower(trim(email)) = lower(trim(p_email))
    AND status != 'cancelled'
  RETURNING registration_attempts INTO v_attempts;

  RETURN jsonb_build_object('status', 'already_registered', 'attempts', COALESCE(v_attempts, 2));
END;
$$;
