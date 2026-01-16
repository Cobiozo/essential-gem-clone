-- Allow anonymous users to view events that require registration (for public registration forms)
-- This is safe because:
-- 1. Only SELECT (read-only)
-- 2. Only active and published events
-- 3. Only events that require registration (webinars)

CREATE POLICY "events_public_registration_access"
  ON events FOR SELECT
  TO anon
  USING (
    is_active = true 
    AND is_published = true 
    AND requires_registration = true
  );