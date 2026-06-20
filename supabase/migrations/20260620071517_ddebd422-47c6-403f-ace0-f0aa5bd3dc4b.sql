-- ============================================================
-- 1) challenge_lesson_progress — izolowany postęp lekcji w wyzwaniu
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenge_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.challenge_participants(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL,
  module_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  dwell_seconds integer NOT NULL DEFAULT 0,
  watched_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_clp_participant ON public.challenge_lesson_progress(participant_id);
CREATE INDEX IF NOT EXISTS idx_clp_lesson ON public.challenge_lesson_progress(lesson_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_lesson_progress TO authenticated;
GRANT ALL ON public.challenge_lesson_progress TO service_role;

ALTER TABLE public.challenge_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own challenge lesson progress"
  ON public.challenge_lesson_progress FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.id = challenge_lesson_progress.participant_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenge_participants cp
      WHERE cp.id = challenge_lesson_progress.participant_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins read all challenge lesson progress"
  ON public.challenge_lesson_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_challenge_lesson_progress_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clp_updated_at ON public.challenge_lesson_progress;
CREATE TRIGGER trg_clp_updated_at
  BEFORE UPDATE ON public.challenge_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_challenge_lesson_progress_updated_at();

-- ============================================================
-- 2) challenge_editions_archive — snapshot zakończonych edycji
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenge_editions_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_days integer NOT NULL,
  participants_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  total_points_awarded integer NOT NULL DEFAULT 0,
  top_participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_pairs jsonb NOT NULL DEFAULT '[]'::jsonb,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_editions_archive TO authenticated;
GRANT ALL ON public.challenge_editions_archive TO service_role;

ALTER TABLE public.challenge_editions_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage challenge archive"
  ON public.challenge_editions_archive FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3) challenge_count_action — filtr start_date + nowy klucz
-- ============================================================
CREATE OR REPLACE FUNCTION public.challenge_count_action(
  _participant_id uuid, _action_key text, _params jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_start date;
  v_start_ts timestamptz;
  v_count integer := 0;
BEGIN
  SELECT user_id, start_date INTO v_user, v_start
    FROM public.challenge_participants WHERE id = _participant_id;
  IF v_user IS NULL THEN RETURN 0; END IF;
  v_start_ts := v_start::timestamptz;

  IF _action_key = 'team_contacts_added' THEN
    SELECT COUNT(*) INTO v_count FROM public.team_contacts
     WHERE user_id = v_user AND created_at >= v_start_ts;

  ELSIF _action_key = 'new_dm_threads' THEN
    SELECT COUNT(DISTINCT participant_id) INTO v_count FROM public.private_chat_threads
     WHERE initiator_id = v_user AND created_at >= v_start_ts;

  ELSIF _action_key = 'shared_resource_recipients' THEN
    SELECT COUNT(DISTINCT (payload->>'recipient_id')) INTO v_count
      FROM public.challenge_activity_log
     WHERE participant_id = _participant_id
       AND action_type = 'share_send'
       AND created_at >= v_start_ts
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
      INTO v_count FROM public.profiles WHERE user_id = v_user;

  ELSIF _action_key = 'resource_view' THEN
    SELECT COUNT(*) INTO v_count FROM public.user_activity_log
     WHERE user_id = v_user
       AND action_type = 'resource_view'
       AND created_at >= v_start_ts
       AND (action_data->>'resource_id') = (_params->>'resource_id');

  ELSIF _action_key = 'page_view' THEN
    -- liczy wyświetlenia o łącznym czasie pobytu >= min_dwell_ms (default 15000)
    SELECT COALESCE(SUM(COALESCE((action_data->>'dwell_ms')::int, 0)), 0) INTO v_count
      FROM public.user_activity_log
     WHERE user_id = v_user
       AND action_type = 'page_view'
       AND created_at >= v_start_ts
       AND page_path = (_params->>'page_path');
    IF v_count >= COALESCE((_params->>'min_dwell_ms')::int, 15000) THEN
      v_count := 1;
    ELSE
      v_count := 0;
    END IF;

  ELSIF _action_key = 'training_lesson_opened' THEN
    SELECT COUNT(*) INTO v_count FROM public.user_activity_log
     WHERE user_id = v_user
       AND action_type = 'training_module_start'
       AND created_at >= v_start_ts
       AND (action_data->>'lesson_id') = (_params->>'lesson_id');

  ELSIF _action_key = 'training_lesson_completed' OR _action_key = 'challenge_lesson_completed' THEN
    -- IZOLACJA: czytamy tylko z challenge_lesson_progress (osobny tor wyzwania)
    SELECT COUNT(*) INTO v_count FROM public.challenge_lesson_progress
     WHERE participant_id = _participant_id
       AND lesson_id = (_params->>'lesson_id')::uuid
       AND completed_at IS NOT NULL;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.challenge_count_action(uuid, text, jsonb) TO authenticated, service_role;