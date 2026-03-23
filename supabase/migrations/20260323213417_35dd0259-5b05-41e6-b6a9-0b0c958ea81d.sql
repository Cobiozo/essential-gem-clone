CREATE OR REPLACE FUNCTION public.get_ticker_live_activity(
  p_types text[],
  p_hours int DEFAULT 24,
  p_max_items int DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  result json;
  items json[] := '{}';
  rec record;
  prof_name text;
BEGIN
  -- 1. Training lesson completions
  IF 'training_lesson_complete' = ANY(p_types) THEN
    FOR rec IN
      SELECT tp.id, tp.completed_at,
             p.first_name, p.last_name,
             tl.title AS lesson_title,
             tm.title AS module_title
      FROM training_progress tp
      JOIN profiles p ON p.user_id = tp.user_id
      JOIN training_lessons tl ON tl.id = tp.lesson_id
      LEFT JOIN training_modules tm ON tm.id = tl.module_id
      WHERE tp.is_completed = true
        AND tp.completed_at >= (now() - (p_hours || ' hours')::interval)
      ORDER BY tp.completed_at DESC
      LIMIT p_max_items
    LOOP
      prof_name := COALESCE(rec.first_name, '') || ' ' || LEFT(COALESCE(rec.last_name, ''), 1) || '.';
      items := items || json_build_object(
        'id', 'activity-lesson-' || rec.id,
        'type', 'activity',
        'icon', 'BookOpen',
        'content', to_char(rec.completed_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI DD.MM') 
          || ' — ' || TRIM(prof_name) || ' ukończył lekcję „' || COALESCE(rec.lesson_title, '') || '"'
          || CASE WHEN rec.module_title IS NOT NULL THEN ' w module „' || rec.module_title || '"' ELSE '' END,
        'isImportant', false,
        'sourceId', rec.id,
        'priority', 30
      )::json;
    END LOOP;
  END IF;

  -- 2. Training module completions
  IF 'training_module_complete' = ANY(p_types) THEN
    FOR rec IN
      SELECT ta.id, ta.completed_at,
             p.first_name, p.last_name,
             tm.title AS module_title
      FROM training_assignments ta
      JOIN profiles p ON p.user_id = ta.user_id
      JOIN training_modules tm ON tm.id = ta.module_id
      WHERE ta.is_completed = true
        AND ta.completed_at IS NOT NULL
        AND ta.completed_at >= (now() - (p_hours || ' hours')::interval)
      ORDER BY ta.completed_at DESC
      LIMIT p_max_items
    LOOP
      prof_name := COALESCE(rec.first_name, '') || ' ' || LEFT(COALESCE(rec.last_name, ''), 1) || '.';
      items := items || json_build_object(
        'id', 'activity-module-' || rec.id,
        'type', 'activity',
        'icon', 'GraduationCap',
        'content', to_char(rec.completed_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI DD.MM')
          || ' — ' || TRIM(prof_name) || ' ukończył moduł „' || COALESCE(rec.module_title, '') || '" 🎓',
        'isImportant', false,
        'sourceId', rec.id,
        'priority', 32
      )::json;
    END LOOP;
  END IF;

  -- 3. Certificates
  IF 'certificate_generated' = ANY(p_types) THEN
    FOR rec IN
      SELECT c.id, COALESCE(c.generated_at, c.created_at) AS gen_at,
             p.first_name, p.last_name,
             tm.title AS module_title
      FROM certificates c
      JOIN profiles p ON p.user_id = c.user_id
      JOIN training_modules tm ON tm.id = c.module_id
      WHERE c.created_at >= (now() - (p_hours || ' hours')::interval)
      ORDER BY c.created_at DESC
      LIMIT p_max_items
    LOOP
      prof_name := COALESCE(rec.first_name, '') || ' ' || LEFT(COALESCE(rec.last_name, ''), 1) || '.';
      items := items || json_build_object(
        'id', 'activity-cert-' || rec.id,
        'type', 'activity',
        'icon', 'Award',
        'content', to_char(rec.gen_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI DD.MM')
          || ' — ' || TRIM(prof_name) || ' zdobył certyfikat „' || COALESCE(rec.module_title, '') || '". GRATULUJEMY! 🎉',
        'isImportant', false,
        'sourceId', rec.id,
        'priority', 33
      )::json;
    END LOOP;
  END IF;

  -- 4. Event registrations
  IF 'event_registration' = ANY(p_types) THEN
    FOR rec IN
      SELECT er.id, er.registered_at,
             p.first_name, p.last_name,
             e.title AS event_title
      FROM event_registrations er
      JOIN profiles p ON p.user_id = er.user_id
      JOIN events e ON e.id = er.event_id
      WHERE er.registered_at >= (now() - (p_hours || ' hours')::interval)
      ORDER BY er.registered_at DESC
      LIMIT p_max_items
    LOOP
      prof_name := COALESCE(rec.first_name, '') || ' ' || LEFT(COALESCE(rec.last_name, ''), 1) || '.';
      items := items || json_build_object(
        'id', 'activity-reg-' || rec.id,
        'type', 'activity',
        'icon', 'CalendarCheck',
        'content', to_char(rec.registered_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI DD.MM')
          || ' — ' || TRIM(prof_name) || ' zarejestrował się na „' || COALESCE(rec.event_title, 'wydarzenie') || '"',
        'isImportant', false,
        'sourceId', rec.id,
        'priority', 30
      )::json;
    END LOOP;
  END IF;

  -- 5. New users
  IF 'new_user_welcome' = ANY(p_types) THEN
    FOR rec IN
      SELECT p.user_id AS id, p.first_name, p.last_name, p.created_at
      FROM profiles p
      WHERE p.created_at >= (now() - (p_hours || ' hours')::interval)
      ORDER BY p.created_at DESC
      LIMIT p_max_items
    LOOP
      prof_name := COALESCE(rec.first_name, '') || ' ' || LEFT(COALESCE(rec.last_name, ''), 1) || '.';
      items := items || json_build_object(
        'id', 'activity-newuser-' || rec.id,
        'type', 'activity',
        'icon', 'UserPlus',
        'content', to_char(rec.created_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI DD.MM')
          || ' — Witamy ' || TRIM(prof_name) || ', nowego użytkownika Pure Life Center! 🎉',
        'isImportant', false,
        'sourceId', rec.id,
        'priority', 35
      )::json;
    END LOOP;
  END IF;

  -- 6. New partners
  IF 'new_partner_joined' = ANY(p_types) THEN
    FOR rec IN
      SELECT p.user_id AS id, p.first_name, p.last_name, p.created_at
      FROM profiles p
      WHERE p.role = 'partner'
        AND p.created_at >= (now() - (p_hours || ' hours')::interval)
      ORDER BY p.created_at DESC
      LIMIT p_max_items
    LOOP
      prof_name := COALESCE(rec.first_name, '') || ' ' || LEFT(COALESCE(rec.last_name, ''), 1) || '.';
      items := items || json_build_object(
        'id', 'activity-partner-' || rec.id,
        'type', 'activity',
        'icon', 'Handshake',
        'content', to_char(rec.created_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI DD.MM')
          || ' — Nowy partner dołączył do zespołu: ' || TRIM(prof_name),
        'isImportant', false,
        'sourceId', rec.id,
        'priority', 35
      )::json;
    END LOOP;
  END IF;

  result := json_build_object('items', COALESCE(array_to_json(items), '[]'::json));
  RETURN result;
END;
$$;