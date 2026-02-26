
-- Drop the old 3-parameter overload to avoid ambiguity
DROP FUNCTION IF EXISTS public.check_event_conflicts(timestamp with time zone, timestamp with time zone, uuid);

-- Replace the 4-parameter version with host_name fallback chain
CREATE OR REPLACE FUNCTION public.check_event_conflicts(
  p_start_time timestamp with time zone, 
  p_end_time timestamp with time zone, 
  p_exclude_event_id uuid DEFAULT NULL::uuid, 
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id uuid, 
  title text, 
  event_type text, 
  host_name text, 
  conflict_start timestamp with time zone, 
  conflict_end timestamp with time zone, 
  team_registered_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
  -- Part 1: events WITHOUT occurrences
  SELECT 
    e.id, 
    e.title, 
    e.event_type,
    COALESCE(
      NULLIF(TRIM(e.host_name), ''),
      NULLIF(TRIM(COALESCE(p_host.first_name, '') || ' ' || COALESCE(p_host.last_name, '')), ''),
      NULLIF(TRIM(COALESCE(p_creator.first_name, '') || ' ' || COALESCE(p_creator.last_name, '')), ''),
      'Nie podano'
    ) AS host_name,
    e.start_time AS conflict_start,
    e.end_time AS conflict_end,
    COALESCE(team_count.cnt, 0) AS team_registered_count
  FROM public.events e
  LEFT JOIN public.profiles p_host ON p_host.user_id = e.host_user_id
  LEFT JOIN public.profiles p_creator ON p_creator.user_id = e.created_by
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.event_registrations er
    JOIN public.profiles p2 ON p2.user_id = er.user_id
    WHERE er.event_id = e.id 
      AND er.status = 'registered'
      AND p_user_id IS NOT NULL
      AND p2.upline_eq_id = (SELECT eq_id FROM public.profiles WHERE user_id = p_user_id)
  ) team_count ON true
  WHERE e.is_active = true
    AND e.event_type IN ('webinar', 'team_training', 'spotkanie_zespolu')
    AND (e.occurrences IS NULL OR jsonb_array_length(e.occurrences) = 0)
    AND e.start_time < p_end_time
    AND e.end_time > p_start_time
    AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)

  UNION

  -- Part 2: events WITH occurrences
  SELECT DISTINCT ON (e.id, occ_start)
    e.id, 
    e.title, 
    e.event_type,
    COALESCE(
      NULLIF(TRIM(e.host_name), ''),
      NULLIF(TRIM(COALESCE(p_host.first_name, '') || ' ' || COALESCE(p_host.last_name, '')), ''),
      NULLIF(TRIM(COALESCE(p_creator.first_name, '') || ' ' || COALESCE(p_creator.last_name, '')), ''),
      'Nie podano'
    ) AS host_name,
    ((occ->>'date') || ' ' || (occ->>'time'))::timestamp AT TIME ZONE 'Europe/Warsaw' AS conflict_start,
    ((occ->>'date') || ' ' || (occ->>'time'))::timestamp AT TIME ZONE 'Europe/Warsaw'
      + ((occ->>'duration_minutes')::int * interval '1 minute') AS conflict_end,
    COALESCE(team_count.cnt, 0) AS team_registered_count
  FROM public.events e
  LEFT JOIN public.profiles p_host ON p_host.user_id = e.host_user_id
  LEFT JOIN public.profiles p_creator ON p_creator.user_id = e.created_by,
    jsonb_array_elements(e.occurrences) AS occ,
    LATERAL (SELECT ((occ->>'date') || ' ' || (occ->>'time'))::timestamp AT TIME ZONE 'Europe/Warsaw' AS occ_start) calc
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.event_registrations er
    JOIN public.profiles p2 ON p2.user_id = er.user_id
    WHERE er.event_id = e.id 
      AND er.status = 'registered'
      AND p_user_id IS NOT NULL
      AND p2.upline_eq_id = (SELECT eq_id FROM public.profiles WHERE user_id = p_user_id)
  ) team_count ON true
  WHERE e.is_active = true
    AND e.event_type IN ('webinar', 'team_training', 'spotkanie_zespolu')
    AND e.occurrences IS NOT NULL
    AND jsonb_array_length(e.occurrences) > 0
    AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)
    AND calc.occ_start < p_end_time
    AND (calc.occ_start + ((occ->>'duration_minutes')::int * interval '1 minute')) > p_start_time
$function$;
