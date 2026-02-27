
CREATE OR REPLACE FUNCTION public.get_all_team_knowledge_resources()
RETURNS TABLE(
  resource_id uuid,
  leader_user_id uuid,
  leader_first_name text,
  leader_last_name text,
  team_custom_name text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT 
    kr.id, kr.created_by,
    p.first_name, p.last_name,
    pt.custom_name
  FROM knowledge_resources kr
  INNER JOIN profiles p ON p.user_id = kr.created_by
  LEFT JOIN platform_teams pt ON pt.leader_user_id = kr.created_by
  WHERE kr.created_by IS NOT NULL AND kr.status = 'active'
  ORDER BY kr.created_at DESC;
END;
$$;
