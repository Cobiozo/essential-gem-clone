CREATE OR REPLACE FUNCTION public.submit_event_form(
  _form_id uuid,
  _first_name text,
  _last_name text,
  _email text,
  _phone text DEFAULT NULL::text,
  _extra jsonb DEFAULT '{}'::jsonb,
  _ref_code text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _form RECORD;
  _link RECORD;
  _partner_user_id UUID := NULL;
  _partner_link_id UUID := NULL;
  _submission_id UUID;
  _confirmation_token TEXT;
  _event_title TEXT;
  _event_start TIMESTAMPTZ;
  _event_label TEXT;
  _date_label TEXT;
BEGIN
  SELECT id, event_id, title, is_active
  INTO _form
  FROM public.event_registration_forms
  WHERE id = _form_id;

  IF NOT FOUND OR NOT _form.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'form_not_found');
  END IF;

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

  IF _partner_link_id IS NOT NULL THEN
    UPDATE public.paid_event_partner_links
    SET submission_count = submission_count + 1
    WHERE id = _partner_link_id;
  END IF;

  IF _partner_user_id IS NOT NULL THEN
    SELECT title, event_date INTO _event_title, _event_start
    FROM public.paid_events WHERE id = _form.event_id;

    _event_label := coalesce(_event_title, _form.title, 'Wydarzenie');
    _date_label := CASE
      WHEN _event_start IS NOT NULL THEN to_char(_event_start, 'DD.MM.YYYY')
      ELSE to_char(now(), 'DD.MM.YYYY')
    END;

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
        'client',
        'private',
        'event_invite: ' || _event_label || ' (' || _date_label || ')',
        'Zapisany przez Twój link na: ' || _event_label || ' (' || _date_label || ')',
        true
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'submit_event_form CRM insert failed: % %', SQLSTATE, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', _submission_id,
    'confirmation_token', _confirmation_token
  );
END;
$function$;

-- Backfill historyczny (ostatnie 60 dni)
INSERT INTO public.team_contacts (
  user_id, first_name, last_name, email, phone_number,
  role, contact_type, contact_source, contact_reason, is_active, created_at
)
SELECT
  s.partner_user_id,
  s.first_name,
  s.last_name,
  lower(s.email),
  s.phone,
  'client',
  'private',
  'event_invite: ' || coalesce(pe.title, erf.title, 'Wydarzenie') ||
    ' (' || to_char(coalesce(pe.event_date, s.created_at), 'DD.MM.YYYY') || ')',
  'Zapisany przez Twój link na: ' || coalesce(pe.title, erf.title, 'Wydarzenie') ||
    ' (' || to_char(coalesce(pe.event_date, s.created_at), 'DD.MM.YYYY') || ')',
  true,
  s.created_at
FROM public.event_form_submissions s
JOIN public.event_registration_forms erf ON erf.id = s.form_id
LEFT JOIN public.paid_events pe ON pe.id = s.event_id
WHERE s.partner_user_id IS NOT NULL
  AND s.created_at >= now() - interval '60 days'
  AND s.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_contacts tc
    WHERE tc.user_id = s.partner_user_id
      AND lower(tc.email) = lower(s.email)
      AND tc.contact_source = 'event_invite: ' || coalesce(pe.title, erf.title, 'Wydarzenie') ||
        ' (' || to_char(coalesce(pe.event_date, s.created_at), 'DD.MM.YYYY') || ')'
  );