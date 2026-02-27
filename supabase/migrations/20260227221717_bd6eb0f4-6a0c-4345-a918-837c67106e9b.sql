
CREATE OR REPLACE FUNCTION public.filter_leader_user_ids(p_user_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT lp.user_id
  FROM public.leader_permissions lp
  WHERE lp.user_id = ANY(p_user_ids);
$$;
