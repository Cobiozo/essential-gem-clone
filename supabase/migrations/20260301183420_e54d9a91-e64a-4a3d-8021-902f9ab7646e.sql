
-- ============================================
-- Table: user_blocks
-- ============================================
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  blocked_by_user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  blocked_by_first_name text,
  blocked_by_last_name text,
  reason text,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  unblocked_at timestamptz,
  unblocked_by_user_id uuid,
  is_active boolean NOT NULL DEFAULT true
);

-- Index for fast lookups
CREATE INDEX idx_user_blocks_blocked_user ON public.user_blocks(blocked_user_id) WHERE is_active = true;
CREATE INDEX idx_user_blocks_blocked_by ON public.user_blocks(blocked_by_user_id) WHERE is_active = true;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Admins see all blocks
CREATE POLICY "Admins can view all blocks"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Leaders see blocks they created
CREATE POLICY "Leaders can view own blocks"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (blocked_by_user_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE — only via RPC
-- (SECURITY DEFINER functions bypass RLS)

-- ============================================
-- RPC: leader_block_user
-- ============================================
CREATE OR REPLACE FUNCTION public.leader_block_user(
  p_target_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
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

  -- 4. Check target role — cannot block admin or partner (leader)
  SELECT ur.role::text INTO v_target_role
  FROM user_roles ur WHERE ur.user_id = p_target_user_id LIMIT 1;

  IF v_target_role IN ('admin', 'partner') THEN
    RAISE EXCEPTION 'Cannot block admin or partner users';
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
$$;

-- ============================================
-- RPC: leader_unblock_user
-- ============================================
CREATE OR REPLACE FUNCTION public.leader_unblock_user(
  p_block_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  v_block record;
  v_is_admin boolean;
BEGIN
  -- Get block record
  SELECT * INTO v_block
  FROM user_blocks WHERE id = p_block_id AND is_active = true;

  IF v_block IS NULL THEN
    RAISE EXCEPTION 'Block record not found or already inactive';
  END IF;

  -- Check permission: admin can unblock anyone, leader only own blocks
  v_is_admin := public.has_role(auth.uid(), 'admin');

  IF NOT v_is_admin AND v_block.blocked_by_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: you can only unblock users you blocked';
  END IF;

  -- Reactivate user
  UPDATE profiles SET is_active = true, updated_at = now()
  WHERE user_id = v_block.blocked_user_id;

  -- Mark block as inactive
  UPDATE user_blocks SET
    is_active = false,
    unblocked_at = now(),
    unblocked_by_user_id = auth.uid()
  WHERE id = p_block_id;

  RETURN true;
END;
$$;
