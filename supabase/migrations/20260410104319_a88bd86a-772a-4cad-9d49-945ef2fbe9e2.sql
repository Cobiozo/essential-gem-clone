
DROP FUNCTION IF EXISTS public.leader_get_team_auto_webinar_access(uuid[]);

CREATE OR REPLACE FUNCTION public.leader_get_team_auto_webinar_access(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, can_access_auto_webinar boolean, has_certificate boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT 
    u.uid AS user_id,
    COALESCE(lp.can_access_auto_webinar, false) AS can_access_auto_webinar,
    (c.id IS NOT NULL) AS has_certificate
  FROM unnest(p_user_ids) AS u(uid)
  LEFT JOIN leader_permissions lp ON lp.user_id = u.uid
  LEFT JOIN certificates c ON c.user_id = u.uid 
    AND c.module_id = '7ba86537-309a-479a-a4d2-d8636acb2148'
$$;
