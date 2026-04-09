DROP FUNCTION IF EXISTS public.leader_get_team_auto_webinar_access(uuid[]);

CREATE OR REPLACE FUNCTION public.leader_get_team_auto_webinar_access(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, can_access_auto_webinar boolean, has_certificate boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' SET row_security TO 'off' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM leader_permissions lp
    WHERE lp.user_id = auth.uid() AND lp.can_manage_auto_webinar_access = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    lp.user_id, 
    COALESCE(lp.can_access_auto_webinar, false),
    (c.id IS NOT NULL)
  FROM leader_permissions lp
  LEFT JOIN certificates c 
    ON c.user_id = lp.user_id 
    AND c.module_id = '7ba86537-309a-479a-a4d2-d8636acb2148'
  WHERE lp.user_id = ANY(p_user_ids);
END; $$;