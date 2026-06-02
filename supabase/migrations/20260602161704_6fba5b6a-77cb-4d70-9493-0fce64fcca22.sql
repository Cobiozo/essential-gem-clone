-- Table for granting ticket verification access to non-admin users
CREATE TABLE public.ticket_verifier_access (
  user_id UUID NOT NULL PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_verifier_access TO authenticated;
GRANT ALL ON public.ticket_verifier_access TO service_role;

ALTER TABLE public.ticket_verifier_access ENABLE ROW LEVEL SECURITY;

-- Users may see only their own access row
CREATE POLICY "Users see own ticket verifier access"
ON public.ticket_verifier_access
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Only admins may grant/modify/revoke access
CREATE POLICY "Admins manage ticket verifier access (insert)"
ON public.ticket_verifier_access
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ticket verifier access (update)"
ON public.ticket_verifier_access
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ticket verifier access (delete)"
ON public.ticket_verifier_access
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Helper used by edge functions and client to check effective access (admin OR explicit grant)
CREATE OR REPLACE FUNCTION public.has_ticket_verifier_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.ticket_verifier_access
      WHERE user_id = _user_id AND is_enabled = true
    )
$$;