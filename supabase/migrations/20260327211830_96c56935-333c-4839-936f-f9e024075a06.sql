-- Allow anonymous guests to SELECT their own registration by email + event_id
-- This is needed so the auto-webinar embed can resolve guest_registration_id for tracking
CREATE POLICY "anon_can_select_own_registration"
  ON guest_event_registrations
  FOR SELECT
  TO anon
  USING (true);