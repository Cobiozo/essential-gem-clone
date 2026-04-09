
CREATE OR REPLACE FUNCTION public.get_partner_hk_sessions(p_partner_id uuid)
RETURNS TABLE(
  session_id uuid,
  guest_first_name text,
  guest_last_name text,
  guest_email text,
  guest_phone text,
  email_consent boolean,
  otp_code text,
  knowledge_title text,
  knowledge_slug text,
  session_created_at timestamptz,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
BEGIN
  -- Only allow the partner themselves or admins
  IF auth.uid() != p_partner_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    s.id AS session_id,
    s.guest_first_name,
    s.guest_last_name,
    s.guest_email,
    s.guest_phone,
    s.email_consent,
    c.code AS otp_code,
    hk.title AS knowledge_title,
    hk.slug AS knowledge_slug,
    s.created_at AS session_created_at,
    s.last_activity_at
  FROM hk_otp_sessions s
  JOIN hk_otp_codes c ON c.id = s.otp_code_id
  JOIN healthy_knowledge hk ON hk.id = c.knowledge_id
  WHERE c.partner_id = p_partner_id
    AND s.guest_first_name IS NOT NULL
  ORDER BY s.created_at DESC;
END;
$$;
