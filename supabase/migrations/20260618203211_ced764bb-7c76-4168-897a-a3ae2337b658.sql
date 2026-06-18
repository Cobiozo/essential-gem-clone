
-- ============== ENUMY ==============
DO $$ BEGIN
  CREATE TYPE public.challenge_task_type AS ENUM (
    'button_click','link_visit','file_download','video_watch',
    'resource_view','training_lesson','manual_confirm','external_action'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.challenge_participant_status AS ENUM ('active','paused','completed','abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.challenge_completion_status AS ENUM ('pending','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.challenge_verification_mode AS ENUM ('auto','manual_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== TABELE ==============

-- challenge_settings (singleton)
CREATE TABLE IF NOT EXISTS public.challenge_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  title text NOT NULL DEFAULT 'Wyzwanie 90-dniowe',
  subtitle text DEFAULT '',
  terms_html text NOT NULL DEFAULT '',
  instructions_html text NOT NULL DEFAULT '',
  banner_url text,
  accent_color text NOT NULL DEFAULT '#7c3aed',
  duration_days int NOT NULL DEFAULT 90,
  excluded_weekdays int[] NOT NULL DEFAULT '{}',
  excluded_dates date[] NOT NULL DEFAULT '{}',
  ranking_visible_to_participants boolean NOT NULL DEFAULT true,
  szybki_start_module_id uuid,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenge_settings TO authenticated;
GRANT ALL ON public.challenge_settings TO service_role;
ALTER TABLE public.challenge_settings ENABLE ROW LEVEL SECURITY;

-- challenge_user_access
CREATE TABLE IF NOT EXISTS public.challenge_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_user_access TO authenticated;
GRANT ALL ON public.challenge_user_access TO service_role;
ALTER TABLE public.challenge_user_access ENABLE ROW LEVEL SECURITY;

-- challenge_leader_permissions
CREATE TABLE IF NOT EXISTS public.challenge_leader_permissions (
  leader_id uuid PRIMARY KEY,
  can_grant_access boolean NOT NULL DEFAULT true,
  can_view_structure_stats boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenge_leader_permissions TO authenticated;
GRANT ALL ON public.challenge_leader_permissions TO service_role;
ALTER TABLE public.challenge_leader_permissions ENABLE ROW LEVEL SECURITY;

-- challenge_participants
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  start_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Warsaw')::date,
  accepted_terms_at timestamptz NOT NULL DEFAULT now(),
  current_day int NOT NULL DEFAULT 1,
  total_points int NOT NULL DEFAULT 0,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  status public.challenge_participant_status NOT NULL DEFAULT 'active',
  completion_date timestamptz,
  excluded_dates date[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.challenge_participants TO authenticated;
GRANT ALL ON public.challenge_participants TO service_role;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- challenge_tasks
CREATE TABLE IF NOT EXISTS public.challenge_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number int NOT NULL CHECK (day_number >= 1),
  title text NOT NULL,
  description text DEFAULT '',
  task_type public.challenge_task_type NOT NULL DEFAULT 'manual_confirm',
  target_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  points int NOT NULL DEFAULT 10,
  required_to_advance boolean NOT NULL DEFAULT false,
  verification_mode public.challenge_verification_mode NOT NULL DEFAULT 'auto',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_challenge_tasks_day ON public.challenge_tasks(day_number);
GRANT SELECT ON public.challenge_tasks TO authenticated;
GRANT ALL ON public.challenge_tasks TO service_role;
ALTER TABLE public.challenge_tasks ENABLE ROW LEVEL SECURITY;

-- challenge_task_completions
CREATE TABLE IF NOT EXISTS public.challenge_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.challenge_participants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.challenge_tasks(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by uuid,
  verification_status public.challenge_completion_status NOT NULL DEFAULT 'pending',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  points_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, task_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_participant ON public.challenge_task_completions(participant_id);
GRANT SELECT, INSERT, UPDATE ON public.challenge_task_completions TO authenticated;
GRANT ALL ON public.challenge_task_completions TO service_role;
ALTER TABLE public.challenge_task_completions ENABLE ROW LEVEL SECURITY;

-- challenge_activity_log
CREATE TABLE IF NOT EXISTS public.challenge_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  participant_id uuid REFERENCES public.challenge_participants(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.challenge_tasks(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_challenge_activity_user ON public.challenge_activity_log(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.challenge_activity_log TO authenticated;
GRANT ALL ON public.challenge_activity_log TO service_role;
ALTER TABLE public.challenge_activity_log ENABLE ROW LEVEL SECURITY;

-- ============== FUNKCJE SECURITY DEFINER ==============

CREATE OR REPLACE FUNCTION public.has_challenge_access(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_uid, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.challenge_user_access WHERE user_id = _uid);
$$;

CREATE OR REPLACE FUNCTION public.user_completed_szybki_start(_uid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _module_id uuid;
  _total int;
  _done int;
BEGIN
  SELECT szybki_start_module_id INTO _module_id FROM public.challenge_settings WHERE id = true;
  IF _module_id IS NULL THEN RETURN false; END IF;

  SELECT count(*) INTO _total FROM public.training_lessons WHERE module_id = _module_id;
  IF _total = 0 THEN RETURN false; END IF;

  SELECT count(*) INTO _done
  FROM public.training_progress tp
  JOIN public.training_lessons tl ON tl.id = tp.lesson_id
  WHERE tl.module_id = _module_id AND tp.user_id = _uid AND tp.completed = true;

  RETURN _done >= _total;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_leader_grant_challenge(_leader_id uuid, _target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _has_perm boolean;
  _in_downline boolean;
BEGIN
  SELECT coalesce(can_grant_access, false) INTO _has_perm
  FROM public.challenge_leader_permissions WHERE leader_id = _leader_id;
  IF NOT coalesce(_has_perm, false) THEN RETURN false; END IF;

  -- prosty check: target ma w łańcuchu sponsorów lidera (rekurencyjnie po profiles.sponsor_id, jeśli istnieje)
  WITH RECURSIVE chain AS (
    SELECT id, sponsor_id FROM public.profiles WHERE id = _target_user_id
    UNION ALL
    SELECT p.id, p.sponsor_id FROM public.profiles p
    JOIN chain c ON p.id = c.sponsor_id
  )
  SELECT EXISTS (SELECT 1 FROM chain WHERE sponsor_id = _leader_id OR id = _leader_id)
  INTO _in_downline;

  RETURN coalesce(_in_downline, false) AND public.user_completed_szybki_start(_target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_leader_view_challenge_stats(_leader_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT can_view_structure_stats FROM public.challenge_leader_permissions WHERE leader_id = _leader_id), false);
$$;

CREATE OR REPLACE FUNCTION public.calculate_challenge_day(_participant_id uuid)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _start date;
  _user_excl date[];
  _global_excl date[];
  _global_wd int[];
  _today date := (now() AT TIME ZONE 'Europe/Warsaw')::date;
  _d date;
  _counter int := 0;
BEGIN
  SELECT start_date, excluded_dates INTO _start, _user_excl
  FROM public.challenge_participants WHERE id = _participant_id;
  IF _start IS NULL OR _today < _start THEN RETURN 0; END IF;

  SELECT excluded_dates, excluded_weekdays INTO _global_excl, _global_wd
  FROM public.challenge_settings WHERE id = true;

  _d := _start;
  WHILE _d <= _today LOOP
    IF NOT (_d = ANY(coalesce(_user_excl,'{}'::date[])))
      AND NOT (_d = ANY(coalesce(_global_excl,'{}'::date[])))
      AND NOT (EXTRACT(ISODOW FROM _d)::int = ANY(coalesce(_global_wd,'{}'::int[])))
    THEN
      _counter := _counter + 1;
    END IF;
    _d := _d + 1;
  END LOOP;

  RETURN _counter;
END;
$$;

-- ============== RLS POLICIES ==============

-- challenge_settings
DROP POLICY IF EXISTS "settings_select_auth" ON public.challenge_settings;
CREATE POLICY "settings_select_auth" ON public.challenge_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings_admin_all" ON public.challenge_settings;
CREATE POLICY "settings_admin_all" ON public.challenge_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- challenge_user_access
DROP POLICY IF EXISTS "access_select_self_or_admin" ON public.challenge_user_access;
CREATE POLICY "access_select_self_or_admin" ON public.challenge_user_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR granted_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "access_admin_manage" ON public.challenge_user_access;
CREATE POLICY "access_admin_manage" ON public.challenge_user_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "access_leader_grant" ON public.challenge_user_access;
CREATE POLICY "access_leader_grant" ON public.challenge_user_access FOR INSERT TO authenticated
  WITH CHECK (granted_by = auth.uid() AND public.can_leader_grant_challenge(auth.uid(), user_id));

-- challenge_leader_permissions
DROP POLICY IF EXISTS "leaderperm_select" ON public.challenge_leader_permissions;
CREATE POLICY "leaderperm_select" ON public.challenge_leader_permissions FOR SELECT TO authenticated
  USING (leader_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "leaderperm_admin_manage" ON public.challenge_leader_permissions;
CREATE POLICY "leaderperm_admin_manage" ON public.challenge_leader_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- challenge_participants
DROP POLICY IF EXISTS "part_self_select" ON public.challenge_participants;
CREATE POLICY "part_self_select" ON public.challenge_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.can_leader_view_challenge_stats(auth.uid()));
DROP POLICY IF EXISTS "part_self_insert" ON public.challenge_participants;
CREATE POLICY "part_self_insert" ON public.challenge_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_challenge_access(auth.uid()));
DROP POLICY IF EXISTS "part_self_update" ON public.challenge_participants;
CREATE POLICY "part_self_update" ON public.challenge_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- challenge_tasks
DROP POLICY IF EXISTS "tasks_select_access" ON public.challenge_tasks;
CREATE POLICY "tasks_select_access" ON public.challenge_tasks FOR SELECT TO authenticated
  USING (public.has_challenge_access(auth.uid()));
DROP POLICY IF EXISTS "tasks_admin_manage" ON public.challenge_tasks;
CREATE POLICY "tasks_admin_manage" ON public.challenge_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- challenge_task_completions
DROP POLICY IF EXISTS "comp_select" ON public.challenge_task_completions;
CREATE POLICY "comp_select" ON public.challenge_task_completions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.challenge_participants p WHERE p.id = participant_id AND p.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR public.can_leader_view_challenge_stats(auth.uid())
  );
DROP POLICY IF EXISTS "comp_insert_self" ON public.challenge_task_completions;
CREATE POLICY "comp_insert_self" ON public.challenge_task_completions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.challenge_participants p WHERE p.id = participant_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "comp_update_admin" ON public.challenge_task_completions;
CREATE POLICY "comp_update_admin" ON public.challenge_task_completions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- challenge_activity_log
DROP POLICY IF EXISTS "log_insert_self" ON public.challenge_activity_log;
CREATE POLICY "log_insert_self" ON public.challenge_activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "log_select_admin" ON public.challenge_activity_log;
CREATE POLICY "log_select_admin" ON public.challenge_activity_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- ============== TRIGGER updated_at ==============
CREATE OR REPLACE FUNCTION public.touch_updated_at_challenge()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_challenge_settings_updated BEFORE UPDATE ON public.challenge_settings
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_challenge();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_challenge_participants_updated BEFORE UPDATE ON public.challenge_participants
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_challenge();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_challenge_tasks_updated BEFORE UPDATE ON public.challenge_tasks
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_challenge();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_challenge_completions_updated BEFORE UPDATE ON public.challenge_task_completions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_challenge();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_challenge_leader_perm_updated BEFORE UPDATE ON public.challenge_leader_permissions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_challenge();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== SEED ustawień ==============
INSERT INTO public.challenge_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
