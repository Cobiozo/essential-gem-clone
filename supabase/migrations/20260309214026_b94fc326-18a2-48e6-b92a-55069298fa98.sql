DROP POLICY IF EXISTS "events_public_registration_access" ON public.events;

CREATE POLICY "events_public_registration_access"
ON public.events
FOR SELECT
TO anon
USING (is_active = true);