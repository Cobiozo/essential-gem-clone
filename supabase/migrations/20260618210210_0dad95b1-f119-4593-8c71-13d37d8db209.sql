
-- Trigger: log new team_contact insert into challenge_activity_log when owner is active challenge participant
CREATE OR REPLACE FUNCTION public.tg_challenge_track_team_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_id uuid;
BEGIN
  SELECT id INTO p_id FROM public.challenge_participants
   WHERE user_id = NEW.user_id AND status = 'active'
   LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO public.challenge_activity_log (user_id, participant_id, action_type, payload)
    VALUES (NEW.user_id, p_id, 'team_contact_added', jsonb_build_object('contact_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_challenge_track_team_contact ON public.team_contacts;
CREATE TRIGGER tg_challenge_track_team_contact
AFTER INSERT ON public.team_contacts
FOR EACH ROW EXECUTE FUNCTION public.tg_challenge_track_team_contact();

-- Trigger: log new private_chat_thread insert
CREATE OR REPLACE FUNCTION public.tg_challenge_track_private_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_id uuid;
BEGIN
  SELECT id INTO p_id FROM public.challenge_participants
   WHERE user_id = NEW.initiator_id AND status = 'active'
   LIMIT 1;
  IF p_id IS NOT NULL THEN
    INSERT INTO public.challenge_activity_log (user_id, participant_id, action_type, payload)
    VALUES (NEW.initiator_id, p_id, 'private_thread_created',
            jsonb_build_object('thread_id', NEW.id, 'participant_id', NEW.participant_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_challenge_track_private_thread ON public.private_chat_threads;
CREATE TRIGGER tg_challenge_track_private_thread
AFTER INSERT ON public.private_chat_threads
FOR EACH ROW EXECUTE FUNCTION public.tg_challenge_track_private_thread();

-- Helper: count actions per participant since start_date matching params
CREATE OR REPLACE FUNCTION public.challenge_count_action(
  _participant_id uuid,
  _action_key text,
  _params jsonb DEFAULT '{}'::jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT CASE WHEN COALESCE(profile_completion_percentage, 0) >= 100 THEN 1 ELSE 0 END
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
$$;

GRANT EXECUTE ON FUNCTION public.challenge_count_action(uuid, text, jsonb) TO authenticated, service_role;
