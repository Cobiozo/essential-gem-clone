CREATE POLICY "partners_select_views_by_contact_email"
ON public.auto_webinar_views FOR SELECT TO authenticated
USING (
  guest_email IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM team_contacts tc
    WHERE tc.email = auto_webinar_views.guest_email
      AND tc.user_id = auth.uid()
      AND tc.is_active = true
  )
);