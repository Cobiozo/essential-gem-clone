DROP FUNCTION IF EXISTS public.get_pending_leader_approvals();

CREATE FUNCTION public.get_pending_leader_approvals()
 RETURNS TABLE(user_id uuid, first_name text, last_name text, email text, eq_id text, upline_eq_id text, upline_first_name text, upline_last_name text, created_at timestamp with time zone, guardian_approved_at timestamp with time zone, email_confirmed_at timestamp with time zone, email_activated boolean, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM leader_permissions
    WHERE leader_permissions.user_id = auth.uid() AND can_approve_registrations = true
  ) THEN
    RAISE EXCEPTION 'Brak uprawnień do przeglądania oczekujących zatwierdzeń';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.first_name,
    p.last_name,
    p.email,
    p.eq_id,
    p.upline_eq_id,
    p.upline_first_name,
    p.upline_last_name,
    p.created_at,
    p.guardian_approved_at,
    u.email_confirmed_at,
    COALESCE(p.email_activated, false) AS email_activated,
    COALESCE(p.is_active, false) AS is_active
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.guardian_approved = true
    AND p.admin_approved = false
    AND COALESCE(p.deletion_status, 'none') IN ('none', '')
    AND (
      p.leader_approver_id = auth.uid()
      OR (
        p.leader_approver_id IS NULL
        AND public.find_nearest_leader_approver(p.user_id) = auth.uid()
      )
    )
  ORDER BY p.guardian_approved_at ASC NULLS LAST;
END;
$function$;