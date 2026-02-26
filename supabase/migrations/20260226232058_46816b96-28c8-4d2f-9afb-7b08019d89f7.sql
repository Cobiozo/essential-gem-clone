
CREATE OR REPLACE FUNCTION public.check_event_conflicts(p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_exclude_event_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, title text, event_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  -- Part 1: events WITHOUT occurrences (original logic)
  SELECT e.id, e.title, e.event_type
  FROM public.events e
  WHERE e.is_active = true
    AND e.event_type IN ('webinar', 'team_training', 'spotkanie_zespolu')
    AND (e.occurrences IS NULL OR jsonb_array_length(e.occurrences) = 0)
    AND e.start_time < p_end_time
    AND e.end_time > p_start_time
    AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)

  UNION

  -- Part 2: events WITH occurrences (new logic)
  SELECT DISTINCT e.id, e.title, e.event_type
  FROM public.events e,
    jsonb_array_elements(e.occurrences) AS occ
  WHERE e.is_active = true
    AND e.event_type IN ('webinar', 'team_training', 'spotkanie_zespolu')
    AND e.occurrences IS NOT NULL
    AND jsonb_array_length(e.occurrences) > 0
    AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)
    AND (
      ((occ->>'date') || ' ' || (occ->>'time'))::timestamp AT TIME ZONE 'Europe/Warsaw'
    ) < p_end_time
    AND (
      ((occ->>'date') || ' ' || (occ->>'time'))::timestamp AT TIME ZONE 'Europe/Warsaw'
      + ((occ->>'duration_minutes')::int * interval '1 minute')
    ) > p_start_time
$function$;
