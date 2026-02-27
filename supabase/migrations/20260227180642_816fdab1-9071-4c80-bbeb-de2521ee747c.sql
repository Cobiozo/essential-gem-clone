
-- Function: get_user_leader_ids
-- Returns all leader user_ids in user's upline chain (including self if leader)
-- Used to filter leader-created events to team members only

CREATE OR REPLACE FUNCTION public.get_user_leader_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $$
DECLARE
  current_eq_id text;
  current_upline_eq_id text;
  found_user_id uuid;
  depth int := 0;
BEGIN
  -- First check if user itself is a leader, return own id
  IF EXISTS (SELECT 1 FROM leader_permissions lp WHERE lp.user_id = p_user_id) THEN
    RETURN NEXT p_user_id;
  END IF;

  -- Get user's upline_eq_id to start walking up
  SELECT p.upline_eq_id INTO current_upline_eq_id
  FROM profiles p
  WHERE p.user_id = p_user_id;

  -- Walk up the upline chain
  WHILE current_upline_eq_id IS NOT NULL AND depth < 20 LOOP
    -- Find the user with this eq_id
    SELECT p.user_id, p.upline_eq_id
    INTO found_user_id, current_upline_eq_id
    FROM profiles p
    WHERE p.eq_id = current_upline_eq_id
      AND p.is_active = true
    LIMIT 1;

    IF found_user_id IS NULL THEN
      EXIT; -- No more upline
    END IF;

    -- If this person is a leader, include them
    IF EXISTS (SELECT 1 FROM leader_permissions lp WHERE lp.user_id = found_user_id) THEN
      RETURN NEXT found_user_id;
    END IF;

    depth := depth + 1;
  END LOOP;
END;
$$;
