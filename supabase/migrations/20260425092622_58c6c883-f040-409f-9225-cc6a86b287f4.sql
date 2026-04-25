CREATE OR REPLACE FUNCTION public.cancel_event_form_submission(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _submission RECORD;
BEGIN
  SELECT id, payment_status, status
  INTO _submission
  FROM public.event_form_submissions
  WHERE cancellation_token = _token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF _submission.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_cancelled', true,
      'was_paid', _submission.payment_status = 'paid'
    );
  END IF;

  UPDATE public.event_form_submissions
  SET status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = 'guest'
  WHERE id = _submission.id;

  RETURN jsonb_build_object(
    'success', true,
    'was_paid', _submission.payment_status = 'paid'
  );
END;
$function$;