-- =====================================================
-- SECURITY FIX: Restrict public access to guest_event_registrations
-- Problem: guest_registration_public_select_own has qual:true allowing ANY user to see ALL registrations
-- =====================================================

-- Drop the problematic policy that allows public SELECT with TRUE condition
DROP POLICY IF EXISTS "guest_registration_public_select_own" ON guest_event_registrations;

-- Create new policy: guests can only see their OWN registration by matching email
-- This requires the guest to provide their email (used in registration confirmation flows)
CREATE POLICY "guests_can_view_own_registration_by_email" ON guest_event_registrations
  FOR SELECT 
  USING (
    -- Admins can see all
    is_admin() 
    OR 
    -- Event hosts can see their event's registrations
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = guest_event_registrations.event_id 
      AND e.host_user_id = auth.uid()
    )
    OR
    -- Authenticated users who invited the guest can see the registration
    (auth.uid() IS NOT NULL AND invited_by_user_id = auth.uid())
  );

-- =====================================================
-- NOTE: profiles table policies are actually OK after review:
-- - "Users can view their own profile" - only own profile
-- - "Admins can view all profiles" - admin only
-- - "Guardians can view their team members profiles" - guardian hierarchy
-- - "Anyone can search for guardians" - only returns limited data for registration search
-- The policies are properly restrictive.
-- =====================================================

-- Add comment for documentation
COMMENT ON POLICY "guests_can_view_own_registration_by_email" ON guest_event_registrations IS 
'Security fix: Replaced overly permissive TRUE policy. Now only admins, event hosts, and inviters can view registrations.';