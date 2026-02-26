
CREATE OR REPLACE FUNCTION public.check_event_conflicts(
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_exclude_event_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, title text, event_type text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT e.id, e.title, e.event_type
  FROM public.events e
  WHERE e.is_active = true
    AND e.event_type IN ('webinar', 'team_training', 'spotkanie_zespolu')
    AND e.start_time < p_end_time
    AND e.end_time > p_start_time
    AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)
$$;
