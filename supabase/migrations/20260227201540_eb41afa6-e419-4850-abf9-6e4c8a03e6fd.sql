
CREATE OR REPLACE FUNCTION public.get_team_knowledge_resources(p_user_id uuid)
 RETURNS TABLE(resource_id uuid, leader_user_id uuid, leader_first_name text, leader_last_name text, team_custom_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    kr.id AS resource_id,
    kr.created_by AS leader_user_id,
    p.first_name AS leader_first_name,
    p.last_name AS leader_last_name,
    pt.custom_name AS team_custom_name
  FROM public.knowledge_resources kr
  INNER JOIN public.profiles p ON p.user_id = kr.created_by
  LEFT JOIN public.platform_teams pt ON pt.leader_user_id = kr.created_by
  WHERE kr.created_by IS NOT NULL
    AND kr.status = 'active'
    AND kr.created_by IN (SELECT public.get_user_leader_ids(p_user_id))
  ORDER BY kr.created_at DESC;
END;
$function$;
