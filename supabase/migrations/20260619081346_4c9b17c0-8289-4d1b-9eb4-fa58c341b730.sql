CREATE OR REPLACE FUNCTION public.challenge_count_action(_participant_id uuid, _action_key text, _params jsonb DEFAULT '{}'::jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_start date;
  v_count integer := 0;
BEGIN
  SELECT user_id, start_date INTO v_user, v_start
    FROM public.challenge_participants WHERE id = _participant_id;
  IF v_user IS NULL THEN RETURN 0; END IF;

  IF _action_key = 'team_contacts_added' THEN
    SELECT COUNT(*) INTO v_count FROM public.team_contacts
     WHERE user_id = v_user AND created_at >= v_start::timestamptz;
  ELSIF _action_key = 'new_dm_threads' THEN
    SELECT COUNT(DISTINCT participant_id) INTO v_count FROM public.private_chat_threads
     WHERE initiator_id = v_user AND created_at >= v_start::timestamptz;
  ELSIF _action_key = 'shared_resource_recipients' THEN
    SELECT COUNT(DISTINCT (payload->>'recipient_id')) INTO v_count
      FROM public.challenge_activity_log
     WHERE participant_id = _participant_id
       AND action_type = 'share_send'
       AND (payload->>'resource_id') = (_params->>'resource_id');
  ELSIF _action_key = 'profile_completion_100' THEN
    SELECT CASE WHEN
        COALESCE(NULLIF(TRIM(first_name), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(TRIM(last_name), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(TRIM(email), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(TRIM(phone_number), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(TRIM(city), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(TRIM(country), ''), NULL) IS NOT NULL
        AND COALESCE(NULLIF(TRIM(avatar_url), ''), NULL) IS NOT NULL
        AND COALESCE(profile_completed, false) = true
      THEN 1 ELSE 0 END
      INTO v_count FROM public.profiles WHERE id = v_user;
  ELSIF _action_key = 'resource_view' THEN
    SELECT COUNT(*) INTO v_count FROM public.user_activity_log
     WHERE user_id = v_user
       AND action_type = 'resource_view'
       AND created_at >= v_start::timestamptz
       AND (action_data->>'resource_id') = (_params->>'resource_id');
  ELSIF _action_key = 'page_view' THEN
    SELECT COUNT(*) INTO v_count FROM public.user_activity_log
     WHERE user_id = v_user
       AND action_type = 'page_view'
       AND created_at >= v_start::timestamptz
       AND page_path = (_params->>'page_path');
  ELSIF _action_key = 'training_lesson_opened' THEN
    SELECT COUNT(*) INTO v_count FROM public.user_activity_log
     WHERE user_id = v_user
       AND action_type = 'training_module_start'
       AND created_at >= v_start::timestamptz
       AND (action_data->>'lesson_id') = (_params->>'lesson_id');
  ELSIF _action_key = 'training_lesson_completed' THEN
    SELECT COUNT(*) INTO v_count FROM public.training_progress
     WHERE user_id = v_user
       AND lesson_id = (_params->>'lesson_id')::uuid
       AND is_completed = true;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$function$;