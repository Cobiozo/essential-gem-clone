
ALTER TABLE public.leader_permissions
  ADD COLUMN IF NOT EXISTS calendar_visibility_scope text NOT NULL DEFAULT 'upline_only';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leader_permissions_calendar_visibility_scope_check'
  ) THEN
    ALTER TABLE public.leader_permissions
      ADD CONSTRAINT leader_permissions_calendar_visibility_scope_check
      CHECK (calendar_visibility_scope IN ('upline_only','everyone'));
  END IF;
END $$;

COMMENT ON COLUMN public.leader_permissions.calendar_visibility_scope IS
  'Zakres widoczności kalendarza spotkań indywidualnych: upline_only (tylko downline lidera) lub everyone (wszyscy zalogowani).';

CREATE OR REPLACE FUNCTION public.get_upline_user_ids(_user_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE chain AS (
    SELECT p.user_id, p.upline_eq_id, 1 AS depth
    FROM public.profiles p
    WHERE p.user_id = _user_id
    UNION ALL
    SELECT parent.user_id, parent.upline_eq_id, chain.depth + 1
    FROM public.profiles parent
    JOIN chain ON parent.eq_id = chain.upline_eq_id
    WHERE chain.depth < 20 AND chain.upline_eq_id IS NOT NULL
  )
  SELECT chain.user_id
  FROM chain
  WHERE chain.user_id <> _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_upline_user_ids(uuid) TO authenticated;
