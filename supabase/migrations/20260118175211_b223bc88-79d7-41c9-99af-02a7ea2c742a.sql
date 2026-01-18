-- Fix RLS policies for individual meeting bookings
-- Problem: events_leaders_manage_own requires auth.uid() = host_user_id for INSERT
-- This blocks booking because the booker creates an event for another user (leader as host)

-- 1. Drop the old blocking policy
DROP POLICY IF EXISTS "events_leaders_manage_own" ON public.events;

-- 2. Create policy for hosts to manage their own individual meetings (UPDATE/DELETE)
CREATE POLICY "events_leaders_manage_own_as_host"
ON public.events
FOR ALL
TO authenticated
USING (
  auth.uid() = host_user_id 
  AND event_type = ANY (ARRAY['private_meeting', 'tripartite_meeting', 'partner_consultation', 'meeting_private']::text[])
)
WITH CHECK (
  auth.uid() = host_user_id 
  AND event_type = ANY (ARRAY['private_meeting', 'tripartite_meeting', 'partner_consultation', 'meeting_private']::text[])
);

-- 3. Create INSERT policy for bookers (allows authenticated user to create individual meetings)
CREATE POLICY "events_allow_booking_individual_meetings"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND event_type = ANY (ARRAY['tripartite_meeting', 'partner_consultation']::text[])
);

-- 4. Create SELECT policy for bookers to view their own bookings
CREATE POLICY "events_booker_can_view_own_bookings"
ON public.events
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  AND event_type = ANY (ARRAY['tripartite_meeting', 'partner_consultation']::text[])
);

-- 5. Create UPDATE policy for bookers to cancel their own bookings (soft delete)
CREATE POLICY "events_booker_can_cancel_own_bookings"
ON public.events
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  AND event_type = ANY (ARRAY['tripartite_meeting', 'partner_consultation']::text[])
)
WITH CHECK (
  auth.uid() = created_by
  AND event_type = ANY (ARRAY['tripartite_meeting', 'partner_consultation']::text[])
);