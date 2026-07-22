GRANT SELECT ON public.hk_otp_sessions TO authenticated;
GRANT ALL ON public.hk_otp_sessions TO service_role;

CREATE POLICY "Partners can view sessions for own HK codes"
ON public.hk_otp_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.hk_otp_codes c
    WHERE c.id = hk_otp_sessions.otp_code_id
      AND (c.partner_id = auth.uid() OR public.is_admin())
  )
);