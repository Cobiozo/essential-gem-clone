CREATE POLICY "users_select_own_contact_views"
ON public.auto_webinar_views
FOR SELECT
TO authenticated
USING (
  guest_registration_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.guest_event_registrations ger
    JOIN public.team_contacts tc ON tc.id = ger.team_contact_id
    WHERE ger.id = auto_webinar_views.guest_registration_id
      AND tc.user_id = auth.uid()
      AND tc.is_active = true
  )
);