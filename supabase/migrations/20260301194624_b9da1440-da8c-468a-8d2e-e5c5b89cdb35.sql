
CREATE OR REPLACE FUNCTION public.leader_block_user(p_target_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  v_leader_eq_id text;
  v_leader_first_name text;
  v_leader_last_name text;
  v_target_role text;
  v_target_first_name text;
  v_target_last_name text;
  v_in_downline boolean := false;
BEGIN
  -- 1. Verify caller has org tree permission (i.e. is a leader)
  IF NOT EXISTS (
    SELECT 1 FROM leader_permissions lp
    WHERE lp.user_id = auth.uid() AND lp.can_view_org_tree = true
  ) THEN
    RAISE EXCEPTION 'Access denied: leader org tree permission required';
  END IF;

  -- 2. Get leader info
  SELECT p.eq_id, p.first_name, p.last_name
  INTO v_leader_eq_id, v_leader_first_name, v_leader_last_name
  FROM profiles p WHERE p.user_id = auth.uid();

  IF v_leader_eq_id IS NULL THEN
    RAISE EXCEPTION 'Leader profile not found';
  END IF;

  -- 3. Get target info
  SELECT p.first_name, p.last_name
  INTO v_target_first_name, v_target_last_name
  FROM profiles p WHERE p.user_id = p_target_user_id;

  IF v_target_first_name IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- 4. Check target role — cannot block admin
  SELECT ur.role::text INTO v_target_role
  FROM user_roles ur WHERE ur.user_id = p_target_user_id LIMIT 1;

  IF v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot block admin users';
  END IF;

  -- 5. Check target is in leader's downline
  SELECT EXISTS (
    SELECT 1 FROM get_organization_tree(v_leader_eq_id, 10) ot
    WHERE ot.id = p_target_user_id AND ot.level > 0
  ) INTO v_in_downline;

  IF NOT v_in_downline THEN
    RAISE EXCEPTION 'Target user is not in your downline';
  END IF;

  -- 6. Check not already blocked
  IF EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE ub.blocked_user_id = p_target_user_id AND ub.is_active = true
  ) THEN
    RAISE EXCEPTION 'User is already blocked';
  END IF;

  -- 7. Deactivate user
  UPDATE profiles SET is_active = false, updated_at = now()
  WHERE user_id = p_target_user_id;

  -- 8. Insert block record
  INSERT INTO user_blocks (
    blocked_user_id, blocked_by_user_id,
    blocked_by_first_name, blocked_by_last_name,
    reason
  ) VALUES (
    p_target_user_id, auth.uid(),
    v_leader_first_name, v_leader_last_name,
    p_reason
  );

  -- 9. Notify admins
  INSERT INTO user_notifications (
    user_id, notification_type, source_module, title, message, metadata
  )
  SELECT
    ur.user_id,
    'system',
    'leader_block',
    format('Lider %s %s zablokował użytkownika', v_leader_first_name, v_leader_last_name),
    format('Użytkownik %s %s został zablokowany przez lidera %s %s. Powód: %s',
      v_target_first_name, v_target_last_name,
      v_leader_first_name, v_leader_last_name,
      COALESCE(p_reason, 'nie podano')),
    jsonb_build_object(
      'blocked_user_id', p_target_user_id,
      'blocked_by_user_id', auth.uid(),
      'reason', p_reason
    )
  FROM user_roles ur WHERE ur.role = 'admin';

  RETURN true;
END;
$function$;
