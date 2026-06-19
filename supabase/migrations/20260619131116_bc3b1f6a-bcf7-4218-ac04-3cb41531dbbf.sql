
-- Add columns for challenge access delegation
ALTER TABLE public.challenge_user_access
  ADD COLUMN IF NOT EXISTS granted_by_role text NOT NULL DEFAULT 'admin';

ALTER TABLE public.leader_permissions
  ADD COLUMN IF NOT EXISTS can_manage_challenge_access boolean NOT NULL DEFAULT false;

-- Drop existing functions if any
DROP FUNCTION IF EXISTS public.leader_get_team_challenge_access(uuid[]);
DROP FUNCTION IF EXISTS public.leader_update_challenge_access(uuid, boolean);

-- Get team challenge access + szybki-start certificate status
CREATE OR REPLACE FUNCTION public.leader_get_team_challenge_access(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, has_access boolean, has_szybki_start_cert boolean, granted_by_role text, granted_by uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH ss AS (
    SELECT szybki_start_module_id AS mid FROM challenge_settings WHERE id = true
  )
  SELECT
    u.uid AS user_id,
    (cua.user_id IS NOT NULL) AS has_access,
    EXISTS (
      SELECT 1 FROM certificates c, ss
      WHERE c.user_id = u.uid
        AND ss.mid IS NOT NULL
        AND c.module_id = ss.mid
    ) AS has_szybki_start_cert,
    cua.granted_by_role,
    cua.granted_by
  FROM unnest(p_user_ids) AS u(uid)
  LEFT JOIN challenge_user_access cua ON cua.user_id = u.uid;
$$;

-- Update access (leader)
CREATE OR REPLACE FUNCTION public.leader_update_challenge_access(
  p_target_user_id uuid,
  p_grant_access boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_leader_eq_id text;
  v_is_in_downline boolean := false;
  v_has_cert boolean := false;
  v_ss_mid uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM leader_permissions
    WHERE user_id = auth.uid()
      AND can_manage_challenge_access = true
  ) THEN
    RAISE EXCEPTION 'Access denied: challenge management permission required';
  END IF;

  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify your own challenge access';
  END IF;

  SELECT eq_id INTO v_leader_eq_id FROM profiles WHERE user_id = auth.uid();
  IF v_leader_eq_id IS NULL THEN
    RAISE EXCEPTION 'Leader profile not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM get_organization_tree(v_leader_eq_id, 10) ot
    WHERE ot.id = p_target_user_id AND ot.level > 0
  ) INTO v_is_in_downline;

  IF NOT v_is_in_downline THEN
    RAISE EXCEPTION 'User is not in your organization structure';
  END IF;

  IF p_grant_access THEN
    SELECT szybki_start_module_id INTO v_ss_mid FROM challenge_settings WHERE id = true;
    IF v_ss_mid IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM certificates WHERE user_id = p_target_user_id AND module_id = v_ss_mid
      ) INTO v_has_cert;
      IF NOT v_has_cert THEN
        RAISE EXCEPTION 'User does not have Szybki Start certificate';
      END IF;
    END IF;

    INSERT INTO challenge_user_access (user_id, granted_by, granted_by_role)
    VALUES (p_target_user_id, auth.uid(), 'leader')
    ON CONFLICT (user_id) DO UPDATE SET
      granted_by = auth.uid(),
      granted_by_role = 'leader',
      granted_at = now();
  ELSE
    DELETE FROM challenge_user_access WHERE user_id = p_target_user_id;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leader_get_team_challenge_access(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leader_update_challenge_access(uuid, boolean) TO authenticated;
