-- SECURITY DEFINER RPC for safe public form submission (bypasses RLS chain on RETURNING)
CREATE OR REPLACE FUNCTION public.submit_event_form(
  _form_id UUID,
  _first_name TEXT,
  _last_name TEXT,
  _email TEXT,
  _phone TEXT,
  _extra JSONB,
  _ref_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _form RECORD;
  _link RECORD;
  _partner_user_id UUID := NULL;
  _partner_link_id UUID := NULL;
  _submission_id UUID;
  _confirmation_token TEXT;
  _event_title TEXT;
BEGIN
  -- Validate form
  SELECT id, event_id, title, is_active
  INTO _form
  FROM public.event_registration_forms
  WHERE id = _form_id;

  IF NOT FOUND OR NOT _form.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'form_not_found');
  END IF;

  -- Resolve partner via ref_code (server-side, prevents spoofing)
  IF _ref_code IS NOT NULL AND length(_ref_code) > 0 THEN
    SELECT id, partner_user_id
    INTO _link
    FROM public.paid_event_partner_links
    WHERE ref_code = _ref_code
      AND form_id = _form.id
      AND is_active = true;

    IF FOUND THEN
      _partner_link_id := _link.id;
      _partner_user_id := _link.partner_user_id;
    END IF;
  END IF;

  -- Insert submission
  INSERT INTO public.event_form_submissions (
    form_id, event_id, first_name, last_name, email, phone,
    submitted_data, partner_link_id, partner_user_id
  )
  VALUES (
    _form.id, _form.event_id,
    NULLIF(trim(_first_name), ''),
    NULLIF(trim(_last_name), ''),
    lower(trim(_email)),
    NULLIF(trim(coalesce(_phone, '')), ''),
    coalesce(_extra, '{}'::jsonb),
    _partner_link_id,
    _partner_user_id
  )
  RETURNING id, confirmation_token INTO _submission_id, _confirmation_token;

  -- Bump partner submission counter
  IF _partner_link_id IS NOT NULL THEN
    UPDATE public.paid_event_partner_links
    SET submission_count = submission_count + 1
    WHERE id = _partner_link_id;
  END IF;

  -- Add guest to partner's CRM (team_contacts) — non-blocking, dedup by (user_id, email)
  IF _partner_user_id IS NOT NULL THEN
    SELECT title INTO _event_title FROM public.paid_events WHERE id = _form.event_id;

    BEGIN
      INSERT INTO public.team_contacts (
        user_id, first_name, last_name, email, phone_number,
        role, contact_type, contact_source, contact_reason, is_active
      )
      VALUES (
        _partner_user_id,
        NULLIF(trim(_first_name), ''),
        NULLIF(trim(_last_name), ''),
        lower(trim(_email)),
        NULLIF(trim(coalesce(_phone, '')), ''),
        'guest', 'guest', 'event_invite',
        'Zapisany przez Twój link na: ' || coalesce(_event_title, _form.title),
        true
      );
    EXCEPTION WHEN unique_violation THEN
      -- contact already exists for this partner — ignore silently
      NULL;
    WHEN OTHERS THEN
      -- never fail submission because of CRM insert
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', _submission_id,
    'confirmation_token', _confirmation_token
  );
END;
$$;

-- Allow anon + authenticated to call it (it's the public registration endpoint)
GRANT EXECUTE ON FUNCTION public.submit_event_form(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;