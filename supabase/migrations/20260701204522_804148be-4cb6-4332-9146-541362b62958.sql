
-- 1) actor_role column on admin_activity_log
ALTER TABLE public.admin_activity_log
  ADD COLUMN IF NOT EXISTS actor_role text NOT NULL DEFAULT 'admin';

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_actor_role_created
  ON public.admin_activity_log (actor_role, created_at DESC);

-- 2) Allow moderators to insert their own activity rows
DROP POLICY IF EXISTS "Moderators can insert own activity logs" ON public.admin_activity_log;
CREATE POLICY "Moderators can insert own activity logs"
  ON public.admin_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- Admins can view all (existing); allow moderators to view their own actions
DROP POLICY IF EXISTS "Moderators can view own activity logs" ON public.admin_activity_log;
CREATE POLICY "Moderators can view own activity logs"
  ON public.admin_activity_log
  FOR SELECT
  TO authenticated
  USING (
    admin_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- 3) Update RPC to allow admin OR moderator with `users` / `users:view` module
CREATE OR REPLACE FUNCTION public.get_user_profiles_with_confirmation()
 RETURNS TABLE(id uuid, email text, role text, first_name text, last_name text, eq_id text, is_active boolean, is_approved boolean, guardian_approved boolean, guardian_approved_at timestamp with time zone, admin_approved_at timestamp with time zone, email_confirmed_at timestamp with time zone, email_activated boolean, email_activated_at timestamp with time zone, last_sign_in_at timestamp with time zone, created_at timestamp with time zone, phone_number text, street_address text, postal_code text, city text, country text, specialization text, profile_description text, upline_first_name text, upline_last_name text, upline_eq_id text, leader_approved boolean, leader_approved_at timestamp with time zone, leader_approver_id uuid, accepted_terms boolean, accepted_privacy boolean, accepted_rodo boolean, accepted_terms_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      LEFT JOIN public.moderator_permissions mp ON mp.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'moderator'::app_role
        AND (
          COALESCE((mp.modules->>'users')::boolean, false) = true
          OR COALESCE((mp.modules->>'users:view')::boolean, false) = true
          OR COALESCE((mp.modules->>'users:edit')::boolean, false) = true
          OR COALESCE((mp.modules->>'users:export')::boolean, false) = true
        )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin or moderator (users) role required.';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id as id,
    p.email::text,
    COALESCE(
      (SELECT ur.role::text FROM public.user_roles ur
        WHERE ur.user_id = p.user_id
        ORDER BY CASE ur.role
          WHEN 'admin' THEN 1
          WHEN 'moderator' THEN 2
          WHEN 'partner' THEN 3
          WHEN 'specjalista' THEN 4
          WHEN 'guest' THEN 5
          WHEN 'client' THEN 6
          ELSE 7 END
        LIMIT 1),
      p.role::text
    ) AS role,
    p.first_name,
    p.last_name,
    p.eq_id,
    p.is_active,
    p.admin_approved as is_approved,
    p.guardian_approved,
    p.guardian_approved_at,
    p.admin_approved_at,
    u.email_confirmed_at,
    p.email_activated,
    p.email_activated_at,
    u.last_sign_in_at,
    u.created_at,
    p.phone_number,
    p.street_address,
    p.postal_code,
    p.city,
    p.country,
    p.specialization,
    p.profile_description,
    p.upline_first_name,
    p.upline_last_name,
    p.upline_eq_id,
    p.leader_approved,
    p.leader_approved_at,
    p.leader_approver_id,
    p.accepted_terms,
    p.accepted_privacy,
    p.accepted_rodo,
    p.accepted_terms_at
  FROM public.profiles p
  JOIN auth.users u ON p.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;
